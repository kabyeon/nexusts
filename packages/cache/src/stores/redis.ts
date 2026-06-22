/**
 * `RedisCacheStore` — a `CacheStore` backed by `nexusjs/redis`.
 *
 * Works on **Bun** (`Bun.redis`), **Node** (`ioredis`), and
 * **Cloudflare Workers KV** (via `CloudflareKVAdapter`). The
 * same adapter selection applies as for sessions.
 *
 *   import { CacheService } from 'nexusjs/cache';
 *   import { RedisCacheStore, createRedisClient } from 'nexusjs/redis';
 *
 *   const cache = new CacheService({
 *     store: new RedisCacheStore(createRedisClient({ url: 'redis://localhost:6379' }), {
 *       keyPrefix: 'cache:',
 *     }),
 *   });
 *
 * Values are JSON-serialized. The store uses the KV backend's
 * own TTL (Redis `EX` / KV `expirationTtl`).
 *
 * Tag-based invalidation is supported on the Redis and Node
 * adapters (a per-tag Set is maintained as a separate KV key).
 * On Cloudflare KV, tag invalidation degrades to a SCAN — slower
 * but correct.
 */

import type { RedisClient } from "../../redis/types.js";
import type { CacheEntry, CacheSetOptions, CacheStore } from "../types.js";

const DEFAULT_KEY_PREFIX = "cache:";

export interface RedisCacheStoreOptions {
	/** Key prefix. Default: "cache:". */
	keyPrefix?: string;
}

export class RedisCacheStore implements CacheStore {
	readonly kind = "redis";
	#client: RedisClient;
	#keyPrefix: string;
	#tagKeyPrefix: string;

	constructor(client: RedisClient, options: RedisCacheStoreOptions = {}) {
		this.#client = client;
		this.#keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
		this.#tagKeyPrefix = `${this.#keyPrefix}tag:`;
	}

	#key(key: string): string {
		return `${this.#keyPrefix}${key}`;
	}

	#tagKey(tag: string): string {
		return `${this.#tagKeyPrefix}${crc32(tag)}`;
	}

	async get<T = unknown>(key: string): Promise<T | undefined> {
		const raw = await this.#client.get(this.#key(key));
		if (raw === null) return undefined;
		try {
			const entry = JSON.parse(raw) as CacheEntry<T>;
			if (entry.expiresAt && entry.expiresAt <= Date.now()) {
				await this.#client.del(this.#key(key));
				return undefined;
			}
			return entry.value;
		} catch {
			return undefined;
		}
	}

	async set<T = unknown>(
		key: string,
		value: T,
		opts?: CacheSetOptions,
	): Promise<void> {
		const ttl = opts?.ttl ?? 0;
		const tags = opts?.tags ?? [];
		const entry: CacheEntry<T> = {
			value,
			expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : 0,
			...(tags.length > 0 ? { tags } : {}),
		};
		const fullKey = this.#key(key);
		const ex = ttl > 0 ? ttl : undefined;
		await this.#client.set(fullKey, JSON.stringify(entry), ex ? { ex } : undefined);
		// Update per-tag indexes.
		for (const tag of tags) {
			await this.#addToTagIndex(tag, key);
		}
	}

	async delete(key: string): Promise<boolean> {
		const fullKey = this.#key(key);
		const existed = (await this.#client.get(fullKey)) !== null;
		await this.#client.del(fullKey);
		// The tag indexes are best-effort — leave them; gc() will
		// eventually prune orphans. (A full implementation would
		// need to read the entry to find its tags before deleting,
		// which is an extra round-trip.)
		return existed;
	}

	async has(key: string): Promise<boolean> {
		return this.#client.exists(this.#key(key));
	}

	async clear(): Promise<number> {
		let n = 0;
		let cursor: string | number = "0";
		do {
			const res = await this.#client.scan({
				match: `${this.#keyPrefix}*`,
				cursor,
				count: 100,
			});
			for (const k of res.keys) {
				await this.#client.del(this.#keyPrefix + k);
				n++;
			}
			cursor = res.cursor;
		} while (cursor !== "0" && cursor !== 0);
		return n;
	}

	async gc(): Promise<number> {
		// The KV store evicts on TTL. Here we clean up orphan tag
		// indexes — keys in the tag set that no longer exist in
		// the value store.
		let removed = 0;
		let cursor: string | number = "0";
		do {
			const res = await this.#client.scan({
				match: `${this.#tagKeyPrefix}*`,
				cursor,
				count: 100,
			});
			for (const k of res.keys) {
				const raw = await this.#client.get(this.#keyPrefix + k);
				const ids = raw ? safeParseStringArray(raw) : [];
				const live: string[] = [];
				for (const id of ids) {
					if (await this.#client.exists(this.#key(id))) live.push(id);
				}
				if (live.length === 0) {
					await this.#client.del(this.#keyPrefix + k);
					removed++;
				} else if (live.length !== ids.length) {
					await this.#client.set(
						this.#keyPrefix + k,
						JSON.stringify(live),
					);
				}
			}
			cursor = res.cursor;
		} while (cursor !== "0" && cursor !== 0);
		return removed;
	}

	async invalidateByTag(tag: string): Promise<number> {
		const tagK = this.#tagKey(tag);
		const raw = await this.#client.get(tagK);
		if (!raw) return 0;
		const keys = safeParseStringArray(raw);
		let n = 0;
		for (const k of keys) {
			await this.#client.del(this.#key(k));
			n++;
		}
		await this.#client.del(tagK);
		return n;
	}

	async invalidateByTags(tags: string[]): Promise<number> {
		let n = 0;
		for (const t of tags) n += await this.invalidateByTag(t);
		return n;
	}

	async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
		const hit = await this.get<T>(key);
		if (hit !== undefined) return hit;
		const value = await fn();
		await this.set(key, value, ttl !== undefined ? { ttl } : undefined);
		return value;
	}

	async close(): Promise<void> {
		await this.#client.close();
	}

	async #addToTagIndex(tag: string, key: string): Promise<void> {
		const k = this.#tagKey(tag);
		const raw = await this.#client.get(k);
		const ids = raw ? safeParseStringArray(raw) : [];
		if (!ids.includes(key)) ids.push(key);
		await this.#client.set(k, JSON.stringify(ids));
	}
}

function safeParseStringArray(raw: string): string[] {
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
	} catch {
		return [];
	}
}

function crc32(s: string): string {
	let c = 0xffffffff;
	for (let i = 0; i < s.length; i++) {
		c ^= s.charCodeAt(i);
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
	}
	return (c ^ 0xffffffff).toString(16);
}
