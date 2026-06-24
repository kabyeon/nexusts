# 애플리케이션 캐시 · `@nexusts/cache`

> English version: [`cache.md`](./cache.md)

`@nexusts/cache`는 플러그 가능한 백엔드, TTL 기반 만료, 태그 기반
무효화, 데코레이터 지원을 갖춘 애플리케이션 레벨 캐싱을 제공합니다.

---

## 설치

cache 모듈은 `@nexusts/core` **내부**에 포함되어 있습니다 — 인메모리
스토어 사용 시 추가 설치가 필요 없습니다.

```ts
import { CacheModule } from '@nexusts/cache';
```

Redis 선택적 피어 의존성:

```
bun add ioredis    # 또는 @redis/client
```

---

## 빠른 시작

```ts
import { Module } from '@nexusts/core';
import { CacheModule } from '@nexusts/cache';

@Module({
  imports: [
    CacheModule.forRoot({
      defaultTtl: 300,      // 5분
      prefix: 'myapp',
    }),
  ],
})
export class AppModule {}
```

---

## 직접 사용

`CacheService`를 서비스에 주입:

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
      60,  // 60초 TTL
    );
  }
}
```

### 직접 키 연산

```ts
await cache.set('key', value, 60);                // 60초 TTL
await cache.set('key', value, { ttl: 120, tags: ['users'] });
const val = await cache.get('key');               // T | undefined
await cache.delete('key');                         // boolean
await cache.clear('users:*');                      // 패턴 삭제
```

---

## 데코레이터

### `@Cacheable`

메서드의 반환값을 캐시:

```ts
import { Cacheable, CacheInvalidate } from '@nexusts/cache';

class UserService {
  @Cacheable('user', (id: string) => id, 60)
  async findById(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

파라미터:

1. `prefix` — 키 네임스페이스 (예: `'user'`)
2. `keyFn` — 메서드 인자에서 서브 키 파생
3. `ttl` — 만료 시간(초) (기본: 60)

### `@CacheInvalidate`

메서드 실행 후 일치하는 캐시 항목을 제거:

```ts
class UserService {
  @CacheInvalidate('user', (id: string) => id)
  async deleteById(id: string) {
    return this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
```

메서드가 성공적으로 실행된 후 `<prefix>:<subKey>*` 패턴과 일치하는 모든
키를 제거합니다.

---

## 스토어

### 인메모리 (기본)

자동 TTL 스윕이 있는 LRU 캐시:

```ts
import { CacheModule, MemoryStore } from '@nexusts/cache';

CacheModule.forRoot({
  store: new MemoryStore({
    max: 10_000,                // 축출 전 최대 항목 수
    sweepIntervalMs: 30_000,    // 30초마다 만료 항목 스윕
  }),
});
```

태그 기반 무효화, LRU 축출, 주기적 스테일 엔트리 정리를 지원합니다.
클러스터 환경에서는 사용할 수 없습니다.

### Redis

멀티 팟 배포용. `@nexusts/redis`가 필요합니다.

**방법 1 — `backend: 'redis'` 단축 옵션 (권장):**

```ts
CacheModule.forRoot({
  backend: 'redis',
  redis: { url: process.env.REDIS_URL },
  defaultTtl: 300,
})
```

Redis 클라이언트와 스토어가 자동으로 생성됩니다.

**방법 2 — 명시적 스토어 인스턴스:**

```ts
import { CacheModule, RedisCacheStore } from '@nexusts/cache';
import { createRedisClient } from '@nexusts/redis';

CacheModule.forRoot({
  store: new RedisCacheStore(
    createRedisClient({ url: process.env.REDIS_URL! }),
    { keyPrefix: 'cache:' },
  ),
})
```

태그 기반 무효화를 지원하며 여러 인스턴스에서 공유 가능합니다.

### Drizzle (데이터베이스)

Drizzle이 지원하는 모든 데이터베이스를 백엔드로 사용:

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

스키마:

```sql
CREATE TABLE nexus_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,            -- JSON 인코딩
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

### 커스텀 스토어

`CacheStore` 인터페이스 구현:

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

## 태그 기반 무효화

태그를 사용하면 관련 캐시 항목 그룹을 한 번에 무효화할 수 있습니다:

```ts
// 태그와 함께 설정
await cache.set('user:42', userData, { ttl: 300, tags: ['users', 'premium'] });
await cache.set('user:99', otherData, { ttl: 300, tags: ['users'] });

// 모든 'users' 항목 한 번에 무효화
await cache.invalidateByTag('users');
```

`MemoryStore`, `RedisCacheStore`, `DrizzleCacheStore`에서 지원합니다.

---

## API 참조

### `CacheModule.forRoot(config)`

| 파라미터 | 타입 | 기본값 | 설명 |
| -------- | ---- | ------ | ---- |
| `backend` | `'memory' \| 'redis'` | `'memory'` | 단축 백엔드 선택자 |
| `redis` | `RedisConnectionOptions` | — | `backend: 'redis'` 시 Redis 접속 설정 |
| `store` | `CacheStore` | `MemoryStore` | 명시적 스토어 인스턴스 (`backend` 보다 우선) |
| `defaultTtl` | `number` | `60` | 기본 TTL(초) |
| `prefix` | `string` | `'nexusts'` | 키 접두사 |

### `CacheService`

| 메서드 | 설명 |
| ------ | ---- |
| `get<T>(key)` | 값 조회 |
| `set<T>(key, value, ttl?)` | TTL과 함께 값 설정 |
| `set<T>(key, value, opts)` | TTL 및 태그와 함께 값 설정 |
| `delete(key)` | 단일 키 삭제 |
| `clear(pattern?)` | 패턴과 일치하는 키 제거 |
| `wrap<T>(key, fn, ttl?)` | 조회-또는-계산 |
| `invalidateByTag(tag)` | 태그가 있는 모든 항목 제거 |

### 데코레이터

| 데코레이터 | 설명 |
| ---------- | ---- |
| `@Cacheable(prefix, keyFn, ttl?)` | 메서드 반환값 캐시 |
| `@CacheInvalidate(prefix, keyFn)` | 메서드 실행 후 캐시 제거 |

---

## 참고

- [`../design/cache.md`](../design/cache.md) — 디자인 문서
- [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md) — 횡단 관심사 모듈 개요
- [`redis.ko.md`](./redis.ko.md) — Redis 클라이언트 설정
