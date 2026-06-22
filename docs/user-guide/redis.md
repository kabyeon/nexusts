# Redis · `@nexusts/redis` (v0.5)

> New in v0.5. Runtime-aware Redis-compatible key/value client
> that powers the new `redis` / `cloudflare-kv` session and
> cache backends.

`@nexusts/redis` provides:

- **`createRedisClient(config)`** — auto-detects the runtime
  when `config.adapter` is omitted.
- **`RedisClient`** — the minimal interface every adapter
  implements.
- **Three runtime adapters** + an in-process `memory` adapter:

  | Adapter | Runtime | External dep |
  | ------- | ------- | ------------- |
  | `bun` | Bun | none (`Bun.redis` built-in) |
  | `node` | Node.js | `ioredis` (optional peer) |
  | `cloudflare` | Cloudflare Workers | none (Workers KV) |
  | `memory` | any / tests | none |

- **`RedisModule.forRoot(config)`** — wires the client into the
  DI container.

Used internally by `@nexusts/session` (Redis + Cloudflare KV
session backends) and `@nexusts/cache` (Redis cache store). You
can also use the client directly for any other use case
(limiter storage, queue inspection, pub/sub, etc.).

---

## 1. Quick start

```ts
import { Module, Inject } from "@nexusts/core";
import { createRedisClient, RedisClient, REDIS_CLIENT_TOKEN, RedisModule } from "@nexusts/redis";

@Module({
  imports: [RedisModule.forRoot({ url: "redis://localhost:6379" })],
})
class AppModule {}

@Injectable()
class RateLimiter {
  constructor(@Inject(REDIS_CLIENT_TOKEN) private redis: RedisClient) {}

  async check(key: string, limit: number): Promise<boolean> {
    const v = await this.redis.incr(key, 1, { ex: 60 });
    return v <= limit;
  }
}
```

Or construct directly without DI:

```ts
const redis = createRedisClient();           // auto-detect
const redis = createRedisClient({ adapter: "bun", url: "redis://localhost:6379" });
const redis = createRedisClient({ adapter: "node", url: "redis://..." });
const redis = createRedisClient({ adapter: "cloudflare" });
```

---

## 2. Runtime auto-detection

`detectRedisRuntime()` returns the adapter that matches the
current runtime. The factory `createRedisClient()` uses it when
`config.adapter` is omitted.

| Runtime | Adapter |
| ------- | ------- |
| Bun | `bun` (uses `Bun.redis`) |
| Node.js | `node` (uses `ioredis`) |
| Cloudflare Workers / Pages | `cloudflare` (uses Workers KV) |
| any other | `memory` (in-process; useful for tests / single-process dev) |

You can also force an adapter explicitly:

```ts
const redis = createRedisClient({ adapter: "memory" }); // for tests
const redis = createRedisClient({ adapter: "node" });   // force Node
```

---

## 3. `RedisClient` API

The interface is intentionally minimal — just what `@nexusts/session`
and `@nexusts/cache` need. Future modules (limiter, queue) can adopt
it without re-defining their own client shape.

```ts
interface RedisClient {
  readonly adapter: "bun" | "node" | "cloudflare" | "memory";

  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: {
    ex?: number; px?: number; nx?: boolean; xx?: boolean;
  }): Promise<void>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  incr(key: string, by?: number, options?: { ex?: number }): Promise<number>;
  scan(options?: { match?: string; cursor?: string | number; count?: number }): Promise<{
    cursor: string | number;
    keys: string[];
  }>;
  close(): Promise<void>;
}
```

### Why this shape?

- **`get` / `set` / `del` / `exists`** — the 4 ops every cache and
  session backend needs. The Bun / Node / Cloudflare adapters
  all map these to their native equivalents.
- **`incr` with optional `ex`** — atomic counter creation with
  TTL. Implemented on Cloudflare via read-modify-write (KV has no
  atomic INCR); for high-contention counters use a real Redis.
- **`scan`** — Redis has SCAN MATCH; Cloudflare KV has
  `KV.list({ prefix })` (a Cloudflare-specific glob, only prefix
  is supported by KV). The `cursor` is a Cloudflare opaque
  string in the Cloudflare adapter, and a number in the Redis
  adapters. Iterate until `cursor === "0"`.

### Key prefix

Set a prefix to namespace your keys (e.g. per app / per
environment). The prefix is prepended to `get` / `set` / `del`
calls and stripped from `scan` results.

```ts
const redis = createRedisClient({
  adapter: "bun",
  url: "redis://localhost:6379",
  keyPrefix: "myapp:prod:",
});
await redis.set("user:42", "alice");   // stored as "myapp:prod:user:42"
const res = await redis.scan({ match: "myapp:prod:user:*" });
// res.keys = ["user:42"]   (prefix stripped)
```

---

## 4. `@nexusts/session` integration

`SessionModule.forRoot({ backend: "redis", redis: { client, keyPrefix } })`
uses `RedisSessionStorage` under the hood. The same code path works
on Bun, Node, or any other runtime that has a `RedisClient`.

```ts
import { SessionModule } from "@nexusts/session";
import { createRedisClient } from "@nexusts/redis";

@Module({
  imports: [
    SessionModule.forRoot({
      backend: "redis",
      redis: {
        client: createRedisClient({ url: process.env.REDIS_URL! }),
        keyPrefix: "sess:",
      },
    }),
  ],
})
class AppModule {}
```

### Cloudflare Workers (KV)

For Cloudflare Workers, pass a `CloudflareKVAdapter` instead of
a Redis adapter. The `SessionService` will use the same code path.

```ts
import { SessionModule } from "@nexusts/session";
import { CloudflareKVAdapter } from "@nexusts/redis";

export default {
  async fetch(req: Request, env: Env) {
    const adapter = new CloudflareKVAdapter({ kv: env.SESSIONS });
    // ... hand the adapter to your session module.
  },
};
```

Or in a `SessionModule.forRoot({ backend: "cloudflare-kv", cloudflareKv: { client, keyPrefix } })`
call — the framework auto-detects the `c.env.KV` binding if you
don't pass it explicitly.

---

## 5. `@nexusts/cache` integration

`RedisCacheStore` is a `CacheStore` implementation that uses a
`RedisClient` underneath. Tag-based invalidation is supported.

```ts
import { CacheService } from "@nexusts/cache";
import { RedisCacheStore, createRedisClient } from "@nexusts/redis";

const cache = new CacheService({
  store: new RedisCacheStore(createRedisClient({ url: process.env.REDIS_URL! })),
});

await cache.set("user:42", user, { ttl: 60, tags: ["user:42"] });
await cache.invalidateByTag("user:42");
```

---

## 6. ioredis as an optional peer dep

Bun apps and Cloudflare Workers apps need **no new dependency**.
Node apps that target `adapter: "node"` need `ioredis`:

```bash
bun add ioredis
```

The package is listed as an `optional` peer dep in `package.json`:
apps that don't use the Node adapter aren't forced to install it.

---

## 7. Configuration

```ts
interface RedisConfig {
  adapter?: "bun" | "node" | "cloudflare" | "memory";
  url?: string;                          // default: REDIS_URL or redis://localhost:6379
  keyPrefix?: string;                    // default: ""
  defaultTtlSeconds?: number;            // default: 0 (no TTL)
  kv?: KVNamespaceLike;                   // Cloudflare-only: the KV binding
  nodeOptions?: Record<string, unknown>;  // Node-only: ioredis options
}
```

---

## 8. See also

- [`./session.md`](./session.md) — `SessionModule` + the new
  `redis` / `cloudflare-kv` backends.
- [`./cache.md`](./cache.md) — `CacheService` + `RedisCacheStore`.
- [Bun Redis docs](https://bun.sh/docs/api/redis)
- [ioredis on npm](https://www.npmjs.com/package/ioredis)
- [Cloudflare Workers KV docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
