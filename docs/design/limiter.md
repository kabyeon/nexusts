# Rate Limiter Module — design

> 한국어 버전: [`limiter.ko.md`](./limiter.ko.md)

This document explains the architecture of `@nexusts/limiter`:
the three strategies, the backend storage interface, how global rules
and decorators interact, and the middleware pipeline.

## Goals

1. **Pluggable strategy.** Support fixed-window, sliding-window, and
   token-bucket out of the box, with room for custom strategies.
2. **Pluggable storage.** Default in-memory for single-process; Drizzle
   for persistence; custom backends for Redis, Workers KV, etc.
3. **Two-tier rule application.** Global rules (matched by path/method)
   and per-route decorators (`@RateLimit`). Both use the same
   `LimiterService.check()` path.
4. **Zero bundle impact.** The module is a separate entry point. Users
   who don't import it pay nothing.
5. **Standard rate-limit headers.** Every response carries
   `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`,
   and `Retry-After` on 429.

## Architecture

```
                  ┌───────────────────────────────┐
                  │       User's Controller         │
                  │  @RateLimit({ points: 5, ... }) │
                  └───────────┬───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   ▼                   │
          │       LimiterMiddleware               │
          │   (applies global rules in order)     │
          │                   │                   │
          │         LimiterService.check(key,rule)│
          │                   ▼                   │
          │       RateLimitStorage.consume(...)   │
          │          ┌─────────────────┐          │
          │          │   MemoryStorage │          │
          │          │  DrizzleStorage │          │
          │          │  CustomStorage  │          │
          │          └─────────────────┘          │
          └───────────────────────────────────────┘
```

### Module wiring

`LimiterModule.forRoot(config)` returns a module class with:

- `LimiterService` bound to `"LIMITER_CONFIG"` (the user config)
- `LimiterMiddleware` injected with the service
- Both exported via their class token and `Symbol.for(...)` token

The middleware is applied in the framework's mount pipeline to every
registered Hono route. It runs **before** the controller handler.

### Rule matching order

1. Global rules (from `forRoot()`) are evaluated first, in array order.
2. Per-route decorator rules are evaluated second, in declaration order.
3. The first rule whose path + method match and that **rejects** the
   request wins. `next()` is called only if all rules pass.

## Strategy implementations

### Fixed-window

A simple counter that resets at fixed intervals. Low memory, predictable
reset boundaries. Vulnerable to burst requests at window boundaries.

```ts
// Pseudocode
if (bucket.resetAt <= now) {
  bucket = { resetAt: now + durationMs, count: 0 };
}
bucket.count += points;
allowed = bucket.count <= limit;
```

### Sliding-window (default)

Maintains a log of request timestamps within the trailing window.
More accurate than fixed-window — a burst at the end of one window and
the start of the next can't double the effective rate.

```ts
// Pseudocode
log = log.filter(t => t > now - durationMs);
log.push(now);
allowed = log.length <= limit;
retryAfter = (log[0] + durationMs - now) / 1000;
```

### Token-bucket

A bucket of tokens that refills at a steady rate. Best for smoothing
bursts over time — e.g., API key rate limits where a client may sit
idle for minutes then send many requests in a second.

```ts
// Pseudocode
elapsed = now - bucket.updatedAt;
bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
bucket.updatedAt = now;
allowed = bucket.tokens >= points;
if (allowed) bucket.tokens -= points;
```

## Storage backends

### In-memory (`MemoryRateLimitStorage`)

- Three separate `Map`s for the three strategies (no union type
  complexity in the hot path).
- No cluster safety. Each process has its own state.
- Fixed-window bucket: `{ resetAt, count }`
- Sliding-window log: `{ log: number[] }` — timestamps
- Token bucket: `{ tokens, updatedAt }`

### Drizzle (`DrizzleRateLimitStorage`)

- Single table with JSONB log column for sliding-window.
- Atomic `UPDATE ... WHERE` concurrency guard.
- Strategy is stored per-key so mixed-strategy setups work.

Both backends implement `RateLimitStorage`:

```ts
interface RateLimitStorage {
  consume(key, points, limit, durationMs, strategy): Promise<RateLimitResult>;
  reset(key): Promise<void>;
}
```

## Decorator integration

`@RateLimit` stores metadata via `Reflect.defineMetadata` under
`Symbol.for("nexus:RateLimitRule")`. Both class-level and method-level
decorators write to the same metadata key on the constructor. The
framework reads this during DI setup and merges the rules into the
global rule list, scoped to the controller's path prefix.

```ts
@Controller('/auth')
@RateLimit({ points: 20, duration: '1m' })        // class-level
class AuthController {
  @Post('/login')
  @RateLimit({ points: 5, duration: '1m' })         // method-level
  login() {}
}
```

Class-level rules apply to all routes of the controller. Method-level
rules layer on top. Both are evaluated; the stricter one (first to
reject) wins.

## Key derivation

Default: `x-forwarded-for` header (first IP) → remote address →
`'unknown'`.

Override per-rule:

```ts
@RateLimit({
  points: 100,
  duration: '1m',
  key: (c) => c.req.header('x-api-key') ?? 'anonymous',
})
```

Or globally:

```ts
LimiterModule.forRoot({
  defaultKey: (c) => c.req.header('x-user-id'),
  rules: [...],
})
```

## Response format

Default 429 response:

```json
{
  "error": "Too Many Requests",
  "limit": 100,
  "remaining": 0,
  "retryAfter": 45
}
```

Headers set on every matched request (not just 429):

- `X-RateLimit-Limit`: `number`
- `X-RateLimit-Remaining`: `number`
- `X-RateLimit-Reset`: `number` (unix seconds)

## Future work

- **Redis storage** — atomic Lua script for all three strategies.
- **Global rate limits** — per-IP or per-user across all routes (not
  just per-path).
- **Rate-limit propagation** — share state across pods via a Redis
  pub/sub bus (warm standby, not eventual consistency).
- **Admin API** — programmatically inspect and reset rate-limit state
  (useful for customer support).

## See also

- [`../user-guide/limiter.md`](../user-guide/limiter.md) — user guide
- [`cross-cutting-features.md`](../user-guide/cross-cutting-features.md) — overview
