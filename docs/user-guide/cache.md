# Application Cache · `@nexusts/cache`

> 한국어 버전: [`cache.ko.md`](./cache.ko.md)

`@nexusts/cache` provides application-level caching with
pluggable backends, TTL-based expiration, tag-based invalidation, and
decorator support.

---

## Installation

The cache module ships **inside** `@nexusts/core` — no extra install
is needed for the in-memory store.

```ts
import { CacheModule } from '@nexusts/cache';
```

Optional peer dependency for Redis:

```
bun add ioredis    # or @redis/client
```

---

## Quick start

```ts
import { Module } from '@nexusts/core';
import { CacheModule } from '@nexusts/cache';

@Module({
  imports: [
    CacheModule.forRoot({
      defaultTtl: 300,      // 5 minutes
      prefix: 'myapp',
    }),
  ],
})
export class AppModule {}
```

---

## Direct usage

Inject `CacheService` into any service:

```ts
import { Inject, Injectable } from '@nexusts/core';
import { CacheService } from '@nexusts/cache';

@Injectable()
class UserService {
  constructor(@Inject(CacheService.TOKEN) private cache: CacheService) {}

  async findById(id: string) {
    return this.cache.wrap(
      `user:${id}`,
      () => this.db.query('SELECT * FROM users WHERE id = $1', [id]),
      60,  // 60-second TTL
    );
  }
}
```

### Direct key operations

```ts
await cache.set('key', value, 60);                // 60s TTL
await cache.set('key', value, { ttl: 120, tags: ['users'] });
const val = await cache.get('key');               // T | undefined
await cache.delete('key');                         // boolean
await cache.clear('users:*');                      // pattern delete
```

---

## Decorators

### `@Cacheable`

Caches the return value of a method:

```ts
import { Cacheable, CacheInvalidate } from '@nexusts/cache';

class UserService {
  @Cacheable('user', (id: string) => id, 60)
  async findById(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

Parameters:

1. `prefix` — key namespace (e.g. `'user'`)
2. `keyFn` — derives the sub-key from method arguments
3. `ttl` — seconds until expiration (default: 60)

### `@CacheInvalidate`

Clears matching cache entries after a method runs:

```ts
class UserService {
  @CacheInvalidate('user', (id: string) => id)
  async deleteById(id: string) {
    return this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
```

The decorator clears all keys matching `<prefix>:<subKey>*` after the
method executes successfully.

---

## Stores

### In-memory (default)

LRU cache with automatic TTL sweep:

```ts
import { CacheModule, MemoryStore } from '@nexusts/cache';

CacheModule.forRoot({
  store: new MemoryStore({
    max: 10_000,                // Max entries before eviction
    sweepIntervalMs: 30_000,    // Sweep expired entries every 30s
  }),
});
```

Supports tag-based invalidation, LRU eviction, and periodic stale
entry cleanup. Not cluster-safe.

### Redis

For multi-pod deployments:

```ts
import { CacheModule } from '@nexusts/cache';
import { RedisCacheStore, createRedisClient } from '@nexusts/redis';

const cache = new CacheService({
  store: new RedisCacheStore(
    createRedisClient({ url: process.env.REDIS_URL! }),
    { keyPrefix: 'cache:' },
  ),
});
```

Requires `@nexusts/redis` and a Redis instance. Supports
tag-based invalidation and works across multiple instances.

### Drizzle (database)

For persistent cache backed by any Drizzle-supported database:

```ts
import { CacheModule, DrizzleCacheStore } from '@nexusts/cache';
import { DrizzleService } from '@nexusts/drizzle';

const db = new DrizzleService({
  dialect: 'postgres',
  connection: { url: process.env.DATABASE_URL! },
});
await db.open();

CacheModule.forRoot({
  store: new DrizzleCacheStore(db, { tableName: 'nexus_cache' }),
});
```

Schema:

```sql
CREATE TABLE nexus_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,            -- JSON-encoded
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE nexus_cache_tags (
  tag  TEXT NOT NULL,
  key  TEXT NOT NULL,
  PRIMARY KEY (tag, key)
);
```

### Custom store

Implement the `CacheStore` interface:

```ts
import { CacheService, CacheStore, CacheSetOptions } from '@nexusts/cache';

class MyStore implements CacheStore {
  readonly kind = 'my-custom';
  async get<T>(key: string): Promise<T | undefined> { /* ... */ }
  async set<T>(key: string, value: T, opts?: CacheSetOptions): Promise<void> { /* ... */ }
  async delete(key: string): Promise<boolean> { /* ... */ }
  async clear(pattern?: string): Promise<number> { /* ... */ }
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> { /* ... */ }
}
```

---

## Tag-based invalidation

Tags allow you to invalidate groups of related cache entries:

```ts
// Setting with tags
await cache.set('user:42', userData, { ttl: 300, tags: ['users', 'premium'] });
await cache.set('user:99', otherData, { ttl: 300, tags: ['users'] });

// Invalidate all 'users' entries at once
await cache.invalidateByTag('users');
```

Supported by `MemoryStore`, `RedisCacheStore`, and `DrizzleCacheStore`.

---

## Events

The cache module does not emit events in v1. Tag invalidation is the
recommended pattern for reactive cache clearing. Future versions may
add event-based invalidation via the event system.

---

## API Reference

### `CacheModule.forRoot(config)`

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `store` | `CacheStore` | `MemoryStore` | Storage backend |
| `defaultTtl` | `number` | `60` | Default TTL in seconds |
| `prefix` | `string` | `'nexusts'` | Key prefix |

### `CacheService`

| Method | Description |
| ------ | ----------- |
| `get<T>(key)` | Get a value |
| `set<T>(key, value, ttl?)` | Set a value with TTL |
| `set<T>(key, value, opts)` | Set with TTL and tags |
| `delete(key)` | Delete a single key |
| `clear(pattern?)` | Clear keys matching pattern |
| `wrap<T>(key, fn, ttl?)` | Get-or-compute |
| `invalidateByTag(tag)` | Remove all entries with a tag |

### Decorators

| Decorator | Description |
| --------- | ----------- |
| `@Cacheable(prefix, keyFn, ttl?)` | Cache method return value |
| `@CacheInvalidate(prefix, keyFn)` | Clear cache after method runs |

---

## See also

- [`../design/cache.md`](../design/cache.md) — design document
- [`cross-cutting-features.md`](./cross-cutting-features.md) — overview of all cross-cutting modules
- [`redis.md`](./redis.md) — Redis client configuration
