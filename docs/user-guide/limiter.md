# Rate Limiting · `@nexusts/limiter`

> 한국어 버전: [`limiter.ko.md`](./limiter.ko.md)

`@nexusts/limiter` provides rate limiting with three strategies,
pluggable storage backends, and decorator-based per-route configuration.

---

## Installation

The limiter module ships **inside** `@nexusts/core` — no extra install
is needed. Import from the `./limiter` entry point:

```ts
import { LimiterModule } from '@nexusts/limiter';
```

---

## Quick start

```ts
import { Module } from '@nexusts/core';
import { LimiterModule } from '@nexusts/limiter';

@Module({
  imports: [
    LimiterModule.forRoot({
      rules: [
        { path: '/api/*',  points: 100, duration: '1m' },
        { path: '/login',  points: 5,   duration: '1m', methods: ['POST'] },
      ],
    }),
  ],
})
export class AppModule {}
```

The middleware applies automatically to every matched route. Rejected
requests receive a `429 Too Many Requests` response with standard
rate-limit headers.

---

## Strategies

Three strategies are available:

| Strategy | Behavior | Use case |
| -------- | -------- | -------- |
| `sliding-window` (default) | Counts requests in the trailing time window | General-purpose |
| `fixed-window` | Counter resets at fixed intervals | Simple burst control |
| `token-bucket` | Tokens refill at a steady rate | API key rate limits |

```ts
LimiterModule.forRoot({
  rules: [
    {
      path: '/search',
      points: 10,
      duration: '1s',
      strategy: 'token-bucket',
    },
  ],
});
```

---

## Global rules

Rules defined in `forRoot()` are evaluated in order. The first matching
rule that rejects the request wins.

```ts
LimiterModule.forRoot({
  rules: [
    // 100 requests per minute for all API routes
    { path: '/api/*',    points: 100, duration: '1m' },
    // Stricter limit for auth endpoints
    { path: '/auth/*',   points: 10,  duration: '1m' },
    // Method-specific rule
    { path: '/login',    points: 5,   duration: '1m', methods: ['POST'] },
  ],
});
```

### Rule options

| Option | Type | Description |
| ------ | ---- | ----------- |
| `path` | `string` | Glob pattern (`*` = one segment, `**` = any depth) |
| `methods` | `string[]` | HTTP methods to apply to (default: all) |
| `points` | `number` | Max requests per window |
| `duration` | `DurationLike` | Window size, e.g. `'1s'`, `'1m'`, `'1h'`, `'1d'` |
| `strategy` | `string` | `'fixed-window'`, `'sliding-window'`, or `'token-bucket'` |
| `key` | `(c) => string` | Custom key derivation (default: IP) |
| `reject` | `(c, result) => Response` | Custom rejection response |
| `skip` | `(c) => boolean` | Skip rule conditionally |

---

## Per-route decorator

Use `@RateLimit` on controller methods for route-specific limits:

```ts
import { Controller, Post } from '@nexusts/core';
import { RateLimit } from '@nexusts/limiter';

@Controller('/auth')
class AuthController {
  @Post('/login')
  @RateLimit({
    points: 5,
    duration: '1m',
    key: (c) => c.req.header('x-api-key') ?? 'unknown',
  })
  login() {
    // Rate-limited per API key
  }
}
```

---

## Storage backends

### In-memory (default)

```ts
LimiterModule.forRoot({
  // No storage config needed; in-memory is the default
  rules: [/*...*/],
});
```

Single-process only. Not cluster-safe.

### Drizzle (database)

For multi-process or persistent rate-limit state:

```ts
import { DrizzleService } from '@nexusts/drizzle';
import { DrizzleRateLimitStorage } from '@nexusts/limiter';

const db = new DrizzleService({
  dialect: 'postgres',
  connection: { url: process.env.DATABASE_URL! },
});
await db.open();

LimiterModule.forRoot({
  storage: new DrizzleRateLimitStorage(db, { tableName: 'rate_limits' }),
  rules: [/*...*/],
});
```

The table schema is:

```sql
CREATE TABLE rate_limits (
  key     TEXT PRIMARY KEY,
  strategy TEXT NOT NULL,
  max_points INTEGER NOT NULL,
  points  INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  log     JSONB
);
```

---

## Custom storage

Implement the `RateLimitStorage` interface:

```ts
import { RateLimitStorage, RateLimitResult } from '@nexusts/limiter';

class RedisRateLimitStorage implements RateLimitStorage {
  readonly kind = 'redis';

  async consume(key, points, limit, durationMs, strategy): Promise<RateLimitResult> {
    // Atomic Lua script: INCR + EXPIRE
  }

  async reset(key): Promise<void> {
    // Clear state for key
  }
}

LimiterModule.forRoot({
  storage: new RedisRateLimitStorage(redisClient),
  rules: [/*...*/],
});
```

---

## Response headers

Every rate-limited response includes:

- `X-RateLimit-Limit` — max points per window
- `X-RateLimit-Remaining` — remaining points
- `X-RateLimit-Reset` — unix-seconds when the window resets
- `Retry-After` — only on `429`

---

## Custom rejection

```ts
LimiterModule.forRoot({
  rules: [
    {
      path: '/api/*',
      points: 100,
      duration: '1m',
      reject: (c, result) =>
        c.json(
          { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
          429,
        ),
    },
  ],
});
```

---

## API Reference

### `LimiterModule.forRoot(config)`

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `storage` | `RateLimitStorage` | `MemoryRateLimitStorage` | Backend storage |
| `rules` | `RateLimitRule[]` | `[]` | Global rate-limit rules |
| `defaultKey` | `(c) => string` | IP-based | Default key derivation |
| `defaultReject` | `(c, result) => Response` | 429 JSON | Default rejection |

### `LimiterService`

| Method | Description |
| ------ | ----------- |
| `check(key, rule)` | Check a single rule against a key |
| `reset(key)` | Reset rate-limit state for a key |

### `@RateLimit(rule)`

Method/class decorator. Attaches a per-route rate-limit rule.

---

## See also

- [`../design/limiter.md`](../design/limiter.md) — design document
- [`cross-cutting-features.md`](./cross-cutting-features.md) — overview of all cross-cutting modules
