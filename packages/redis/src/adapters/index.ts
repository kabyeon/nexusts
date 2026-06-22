/**
 * Runtime detection and factory for `nexusjs/redis` adapters.
 *
 * - `Bun` → `BunRedisAdapter` (built-in `Bun.redis`, no extra package).
 * - `node` → `NodeRedisAdapter` (uses `ioredis` — install separately).
 * - `cloudflare` (Workers / Pages) → `CloudflareKVAdapter` (Workers KV).
 * - `memory` → `MemoryRedisAdapter` (always available, no external dep).
 *
 * The factory `createRedisClient(config)` auto-detects when
 * `config.adapter` is omitted.
 */

import type { RedisAdapterKind, RedisClient, RedisConfig } from "../types.js";
import { BunRedisAdapter } from "./bun.js";
import { CloudflareKVAdapter } from "./cloudflare.js";
import { MemoryRedisAdapter } from "./memory.js";
import { NodeRedisAdapter } from "./node.js";

/** Detect the active runtime. */
export function detectRedisRuntime(): RedisAdapterKind {
	// Cloudflare Workers — most specific first.
	if (
		typeof (globalThis as { caches?: unknown }).caches !== "undefined" &&
		typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined"
	) {
		return "cloudflare";
	}
	if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") return "bun";
	if (typeof process !== "undefined" && process.versions?.node) return "node";
	return "memory";
}

/**
 * Create a Redis client with the configured (or auto-detected)
 * adapter.
 *
 *   const client = createRedisClient({ adapter: "bun", url: "redis://localhost:6379" });
 *   await client.set("hello", "world", { ex: 60 });
 *   console.log(await client.get("hello")); // → "world"
 */
export function createRedisClient(config: RedisConfig = {}): RedisClient {
	const adapter = config.adapter ?? detectRedisRuntime();
	switch (adapter) {
		case "bun":
			return new BunRedisAdapter(config);
		case "node":
			return new NodeRedisAdapter(config);
		case "cloudflare":
			return new CloudflareKVAdapter(config);
		case "memory":
			return new MemoryRedisAdapter(config);
		default: {
			const _exhaustive: never = adapter;
			throw new Error(`unknown redis adapter: ${_exhaustive as string}`);
		}
	}
}

export {
	BunRedisAdapter,
	CloudflareKVAdapter,
	MemoryRedisAdapter,
	NodeRedisAdapter,
};