# Redis Module — design

> 한국어 버전: [`redis.ko.md`](./redis.ko.md)

This document explains the architecture of `@nexusts/redis`:
the unified `RedisClient` interface, runtime-aware adapter selection,
and how session/cache/queue modules depend on it.

## Goals

1. **Single `RedisClient` interface across runtimes.** Bun's built-in
   `Bun.redis`, Node.js's `ioredis`, and Cloudflare Workers KV — all
   behind the same minimal API.
2. **Runtime auto-detection.** Create the right adapter without manual
   configuration. `createRedisClient()` detects Bun, Node, or Workers
   and returns the matching implementation.
3. **Optional peer dependencies.** `ioredis` is only required on Node.
   Bun and Workers adapters use built-in APIs (zero deps).
4. **Shared foundation.** `nexusts/session`, `nexusts/cache`, and
   `nexusts/queue` all depend on `RedisClient`, so a single config
   switch chooses the backend for all three.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Consumers                                 │
│                                                              │
│  SessionModule  CacheModule  QueueModule  User code          │
│       │             │            │           │               │
│       └─────────────┼────────────┼───────────┘               │
│                     ▼            ▼                           │
│              RedisClient interface                           │
│                                                              │
│  get(key) → T | null                                         │
│  set(key, value, opts?)                                      │
│  del(key) → boolean                                          │
│  exists(key) → boolean                                       │
│  expire(key, seconds)                                        │
│  scan(opts) → { cursor, keys }                               │
│  close()                                                     │
└──────────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
┌──────────────┐ ┌─────────┐ ┌──────────────────┐
│ BunRedis     │ │ NodeRedis│ │ CloudflareKV     │
│ Adapter      │ │ Adapter  │ │ Adapter          │
│              │ │          │ │                  │
│ Bun.redis    │ │ ioredis  │ │ c.env.KV_NAMESPACE│
│ (built-in)   │ │ (peer)   │ │ (runtime env)    │
└──────────────┘ └─────────┘ └──────────────────┘
```

## The `RedisClient` interface

```ts
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: RedisSetOptions): Promise<void>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<boolean>;
  scan(opts?: RedisScanOptions): Promise<RedisScanResult>;
  close(): Promise<void>;
}
```

Minimal by design. It intentionally does not include the full Redis
command set (PUB/SUB, transactions, streams, etc.). Users who need
those should use the underlying adapter directly (`client.raw`).

The `RedisSetOptions` includes `ex` (TTL seconds) and `nx`/`xx`
(conditional set).

## Runtime detection

`detectRedisRuntime()` returns one of:

| Runtime | Detected when | Adapter | External dep |
|---------|---------------|---------|-------------|
| `bun` | `typeof Bun !== 'undefined'` | `BunRedisAdapter` | None |
| `node` | `typeof process.versions.node !== 'undefined'` | `NodeRedisAdapter` | `ioredis` (optional) |
| `cloudflare` | `typeof caches !== 'undefined'` | `CloudflareKVAdapter` | None |
| `memory` | (fallback) | `MemoryRedisAdapter` | None |

The memory adapter is always available — it stores data in a `Map`.
It's the default when no runtime is detected and no config is provided.
Useful for tests and local development without a Redis instance.

## Adapter implementations

### BunRedisAdapter

Wraps `Bun.redis` (built into Bun):

```ts
class BunRedisAdapter implements RedisClient {
  private client: ReturnType<typeof Bun.redis>;
  constructor(url: string) {
    this.client = Bun.redis(url);
  }
  // Delegates to this.client.get/set/del/...
}
```

### NodeRedisAdapter

Wraps `ioredis` (loaded lazily):

```ts
class NodeRedisAdapter implements RedisClient {
  private client: any; // ioredis instance
  constructor(opts: { url: string }) {
    // Dynamic import — only when actually used
    const Redis = await import('ioredis').then(m => m.default);
    this.client = new Redis(opts.url);
  }
}
```

### CloudflareKVAdapter

Wraps a Workers KV namespace:

```ts
class CloudflareKVAdapter implements RedisClient {
  constructor(private kv: KVNamespace) {}
  async get(key: string) { return this.kv.get(key); }
  async set(key, value, opts?) {
    await this.kv.put(key, value, { expirationTtl: opts?.ex });
  }
  // ...
}
```

### MemoryRedisAdapter

In-memory `Map`-backed adapter, always available.

## DI integration

```ts
RedisModule.forRoot({
  url: process.env.REDIS_URL!,  // or omit for memory adapter
  // adapter: 'bun' | 'node' | 'cloudflare' | 'memory' (auto-detected by default)
})
```

Registers `RedisClient` under `REDIS_CLIENT_TOKEN`:

```
ApplicationContainer
  └── ConfiguredRedisModule
        ├── REDIS_CLIENT_TOKEN (Symbol)
        └── "REDIS_CONFIG" (useValue: config)
```

Consumers inject `@Inject(REDIS_CLIENT_TOKEN)` and get the right adapter
at runtime.

## Usage by other modules

| Module | Uses `RedisClient` for |
|--------|----------------------|
| session | Session store (RedisSessionStore) |
| cache | Cache store (RedisCacheStore) |
| queue | Queue backend (not yet implemented) |

These modules accept a `RedisClient` in their config and use it
transparently. The user creates the adapter once via
`createRedisClient()` and passes it to all three.

## Future work

- **Connection pool** — multiple connections for high-throughput
  scenarios.
- **TLS support** — `rediss://` URL handling for both Bun and Node.
- **Cluster/Sentinel support** — connect to Redis clusters
  transparently.
- **Pub/Sub** — typed `subscribe()`/`publish()` for event bridge.

## See also

- [`../user-guide/redis.md`](../user-guide/redis.md) — user guide
- [`../design/session.md`](../design/session.md) — session module (uses RedisClient)
- [`../design/cache.md`](../design/cache.md) — cache module (uses RedisClient)
