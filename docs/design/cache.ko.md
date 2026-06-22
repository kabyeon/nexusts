# 캐시 모듈 — 디자인

> English version: [`cache.md`](./cache.md)

이 문서는 `@nexusts/cache`의 아키텍처를 설명한다:
`CacheStore` 인터페이스, 세 가지 내장 백엔드, `wrap` 패턴,
데코레이터 통합, 태그 기반 무효화.

## 목표

1. **플러그 가능한 백엔드.** 메모리(기본), Redis, Drizzle — 그리고
   `CacheStore`를 구현하는 모든 사용자 정의 백엔드.
2. **Cache-or-compute (`wrap`).** 단일 원자적 패턴: 먼저 캐시 확인,
   미스 시 계산, 결과 저장. `get`과 `set` 사이의 TOCTOU 경합 방지.
3. **태그 기반 무효화.** 정확한 키를 모르는 상태에서 관련 항목 그룹을
   무효화. 관련 데이터가 변경될 때 캐시 일관성 유지에 필수적.
4. **데코레이터 API.** 서비스 메서드에 선언적 캐싱을 위한 `@Cacheable`
   및 `@CacheInvalidate`.
5. **크로스 런타임.** Bun, Node.js, Cloudflare Workers에서 작동
   (Drizzle 스토어 또는 사용자 정의 어댑터를 통해).

## 아키텍처

```
사용자 코드
  │
  ├── 직접: cache.get('key'), cache.set('key', value, { ttl, tags })
  │
  ├── wrap:  cache.wrap('key', async () => compute(), 60)
  │
  └── 데코레이터:
        @Cacheable('user', id => id, 60)
        async findById(id) { ... }

                │
                ▼
          CacheService
          ┌─────────────────┐
          │  prefix = 'app'  │
          │  defaultTtl = 60 │
          └────────┬────────┘
                   │
                   ▼
             CacheStore
          ┌──────────────────────┐
          │ MemoryStore          │  ← 기본
          │ RedisCacheStore      │  ← @nexusts/redis 필요
          │ DrizzleCacheStore    │  ← DrizzleService 인스턴스 필요
          │ CustomStore          │  ← CacheStore 인터페이스 구현
          └──────────────────────┘
```

## `CacheEntry` 포맷

```ts
interface CacheEntry<T> {
  value: T;
  expiresAt: number;          // unix-ms. 0 = 만료 없음.
  tags?: string[];
}
```

스토어는 이를 JSON으로 직렬화. `expiresAt` 필드는 read 시 평가됨 —
만료된 항목은 lazy 삭제 (`get` 시)되거나 주기적 sweep
(`MemoryStore.gc()`)에 의해 삭제됨.

## 백엔드 비교

| 기능 | MemoryStore | RedisCacheStore | DrizzleCacheStore |
|------|-------------|-----------------|-------------------|
| 영속성 | 없음 (프로세스) | Redis | 데이터베이스 |
| 클러스터 안전 | 아니오 | 예 | 예 |
| 태그 무효화 | 예 (in-memory Set) | 예 (태그당 키) | 예 (tags 테이블) |
| TTL | 프로세스 내 sweep | Redis EXPIRE | SQL WHERE |
| LRU 축출 | 예 (max.entries) | 아니오 (Redis 축출) | 아니오 |
| 마이그레이션 | 없음 | 없음 | 필요 (CREATE TABLE) |

### MemoryStore

- 설정 가능한 `max` entries의 LRU 맵.
- 태그 인덱스는 `Map<tag, Set<key>>`.
- Sweep 타이머는 `sweepIntervalMs`마다 만료된 항목을 제거.
- 타이머는 `unref()`를 사용하여 프로세스를 살려두지 않음.

### RedisCacheStore

- `@nexusts/redis`의 통합 `RedisClient` 인터페이스 사용.
- 값은 `CacheEntry<T>` envelope로 JSON 직렬화.
- 태그 인덱스는 태그당 별도 Redis 키 (키 충돌 방지를 위해 CRC32-hashed 태그 이름).
- TTL은 Redis의 네이티브 `SET`의 `EX` 옵션 사용.
- GC는 고아 태그 인덱스 항목을 sweep (더 이상 존재하지 않는 키).

### DrizzleCacheStore

- 두 테이블: `cache_entries`와 `cache_tags`.
- 원자적 upsert를 위해 SQL `INSERT ... ON CONFLICT` (또는 동등) 사용.
- 태그 무효화는 단일 `DELETE FROM cache_tags WHERE tag = ?` 후
  `DELETE FROM cache_entries WHERE key IN (...)` 사용.
- 만료된 항목은 `get()` 시 lazy 또는 `gc()`를 통해 명시적으로 정리.

## `wrap` 패턴

```ts
async wrap<T>(key, fn, ttl): Promise<T> {
  const hit = await this.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  await this.set(key, value, { ttl });
  return value;
}
```

이는 distributed lock이 아님 — 두 동시 요청이 모두 miss하면 둘 다
계산하고 두 번째가 덮어씀. 대부분의 애플리케이션에서 이는 OK (밀리초
동안 stale data). 캐시 stampede 보호를 위해서는 distributed lock 사용
(future work).

## 데코레이터 통합

### `@Cacheable(prefix, keyFn, ttl)`

원본 메서드를 `cache.wrap()`으로 감쌈:

```ts
// 원본
@Cacheable('user', (id) => id, 60)
async findById(id) { return db.query(...) }

// 동등
async findById(id) {
  return cache.wrap(`user:${id}`, () => db.query(...), 60);
}
```

데코레이터는 `CacheableSpec` 메타데이터를 `"nexus:cache:cacheable"` 키 아래
저장. `CacheService.applyDecorators(target)`가 이 메타데이터를 읽고
각 데코레이트된 메서드를 wrapper로 교체.

### `@CacheInvalidate(prefix, keyFn)`

메서드 실행 후 매칭하는 키를 제거:

```ts
// 원본
@CacheInvalidate('user', (id) => id)
async deleteById(id) { return db.query(...) }

// 동등
async deleteById(id) {
  const result = await db.query(...);
  await cache.clear(`user:${id}*`);
  return result;
}
```

정확한 키 삭제가 아닌 prefix-match 클리어 (`cache.clear('user:42*')`)를
사용하여 composite 캐시 (예: `user:42`, `user:42:posts`, `user:42:friends`)
를 처리.

## 태그 기반 무효화

태그는 prefix 기반 클리어의 대안으로, 더 정밀한 무효화를 위한 옵션:

```ts
// 태그와 함께 set
await cache.set('user:42', data, { tags: ['user', 'premium'] });

// 모든 'premium' 항목 무효화
await cache.invalidateByTag('premium');
// 제거: user:42 (태그 없으면 user:99는 안 함)
```

구현:

- **MemoryStore**: `Map<tag, Set<key>>` 인덱스. `invalidateByTag`은
  `get(tag) → Set<key> → 각 key 삭제`를 O(n)에 (n = 해당 태그를 가진
  항목 수).
- **RedisCacheStore**: 태그당 키 (`cache:tag:<crc32(tag)>`)는 캐시
  키의 JSON 배열을 저장. `invalidateByTag`은 목록을 읽고, 각 키를
  삭제한 후, 태그 키를 삭제.
- **DrizzleCacheStore**: `(tag, key)` 행을 가진 `cache_tags` 테이블.
  `invalidateByTag`은 SQL `DELETE FROM cache_entries WHERE key IN
  (SELECT key FROM cache_tags WHERE tag = ?)` 실행.

## Future work

- **분산 stampede 보호** — 캐시 miss 발생 시 하나의 계산만 실행되도록
  CAS 토큰 또는 distributed lock 사용.
- **압축** — 저장 전 큰 값 gzip (opt-in).
- **직렬화 hook** — JSON이 아닌 타입 (예: `Buffer`, `Date`, `BigInt`)을
  위한 커스텀 직렬화기.
- **캐시 통계** — metrics로 노출되는 hit/miss/축출 카운터.
- **이벤트 기반 무효화** — 항목 제거 시 `cache:invalidated` 이벤트
  발생, 다른 서비스가 반응 가능.

## 참고

- [`../user-guide/cache.ko.md`](../user-guide/cache.ko.md) — 사용자 가이드
- [`../user-guide/redis.ko.md`](../user-guide/redis.ko.md) — Redis 클라이언트
- [`di-container.ko.md`](./di-container.ko.md) — `useExisting` 동작 방식
