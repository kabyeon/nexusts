/**
 * Public types for `nexus/redis`.
 *
 * `nexus/redis` is a thin, runtime-aware abstraction over a
 * Redis-compatible key-value store. The same API works on:
 *
 * - **Bun** (primary): uses the built-in `Bun.redis` — no
 *   extra package needed.
 * - **Node.js**: uses the `ioredis` package (optional peer dep).
 * - **Cloudflare Workers / Pages**: uses Workers KV
 *   (`c.env.KV`). KV is **not** Redis, but the surface is
 *   close enough that a single API serves both — KV is
 *   eventually consistent and limited to ~25 MB per value,
 *   so use it only for ephemeral state like sessions and
 *   short-lived cache.
 *
 *   For the Cloudflare case, set `adapter: "cloudflare"` and
 *   pass the `KVNamespace` binding via `client.env.KV`. The
 *   framework will pick it up automatically when running in
 *   the Workers runtime.
 *
 * Zero hard deps. `ioredis` is an **optional** peer dep —
 *   install it only when targeting Node.
 */

export type RedisAdapterKind = "bun" | "node" | "cloudflare" | "memory";

/** A single key/value with optional expiry. */
export interface RedisSetOptions {
	/** TTL in seconds. */
	ex?: number;
	/** TTL in milliseconds. */
	px?: number;
	/** Only set if the key does not exist. */
	nx?: boolean;
	/** Only set if the key already exists. */
	xx?: boolean;
}

/** Result of a `get` call — `null` if missing. */
export type RedisValue = string | null;

/** A single key returned by `scan` / `keys`. */
export type RedisKey = string;

/** Cursor returned by `scan`. */
export type RedisCursor = string | number;

/** Scan options. */
export interface RedisScanOptions {
	/** Match pattern. Default: `*` (all keys). */
	match?: string;
	/** Number of keys per cursor step. Default: 100. */
	count?: number;
	/** Starting cursor. Default: 0. */
	cursor?: RedisCursor;
}

/** Result of a single `scan` step. */
export interface RedisScanResult {
	/** Next cursor; `"0"` means iteration is complete. */
	cursor: RedisCursor;
	/** Keys found in this step. */
	keys: RedisKey[];
}

/**
 * The minimal Redis-compatible API surface that NexusJS modules
 * (session, cache, queue) depend on. Adapters implement this.
 */
export interface RedisClient {
	readonly adapter: RedisAdapterKind;

	/** Get a value by key. `null` if missing. */
	get(key: string): Promise<RedisValue>;

	/**
	 * Set a value with optional expiry. Resolves once the value
	 * is durably written.
	 */
	set(key: string, value: string, options?: RedisSetOptions): Promise<void>;

	/** Delete a key. Returns the number of keys removed (0 or 1). */
	del(key: string): Promise<number>;

	/** Test whether a key exists. */
	exists(key: string): Promise<boolean>;

	/**
	 * Increment a counter, optionally setting an initial value
	 * with `ex` (only applied on creation). Resolves to the new
	 * value.
	 */
	incr(key: string, by?: number, options?: { ex?: number }): Promise<number>;

	/**
	 * Iterate keys. Each call returns a cursor; pass the next
	 * cursor back in until `cursor === "0"`. For Cloudflare KV
	 * this is implemented via `KV.list()`.
	 */
	scan(options?: RedisScanOptions): Promise<RedisScanResult>;

	/** Close the client (release sockets, etc.). No-op for in-memory. */
	close(): Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

export interface RedisConfig {
	/**
	 * Adapter to use. Default: auto-detected from the runtime.
	 * - `"bun"`:        uses `Bun.redis`
	 * - `"node"`:       uses `ioredis`
	 * - `"cloudflare"`: uses Workers KV (set `client.env.KV`)
	 * - `"memory"`:     in-process map (no external dep; useful
	 *                   for tests / single-process dev)
	 */
	adapter?: RedisAdapterKind;

	/**
	 * Redis server URL. Used by `bun` and `node` adapters.
	 * Default: `process.env.REDIS_URL ?? "redis://localhost:6379"`.
	 */
	url?: string;

	/** Key prefix. Default: `""` (no prefix). */
	keyPrefix?: string;

	/** Default TTL in seconds. `0` = no expiry. Default: 0. */
	defaultTtlSeconds?: number;

	/**
	 * Cloudflare-only. The `KVNamespace` binding to use. The
	 * framework auto-detects `c.env?.KV` at boot when running
	 * on Workers; you can also pass it explicitly.
	 */
	kv?: KVNamespaceLike;

	/**
	 * Node-only. Extra `ioredis` options (tls, password, db index,
	 * retry strategy, etc.). Ignored by other adapters.
	 */
	nodeOptions?: Record<string, unknown>;
}

/** Minimal shape we need from Workers `KVNamespace`. */
export interface KVNamespaceLike {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number; expiration?: number | string; metadata?: unknown }): Promise<void>;
	delete(key: string): Promise<void>;
	list<Metadata = unknown>(options?: {
		prefix?: string;
		limit?: number;
		cursor?: string;
	}): Promise<{ keys: { name: string; metadata?: Metadata }[]; cursor: string; list_complete: boolean }>;
}
