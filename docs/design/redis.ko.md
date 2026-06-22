# Redis 모듈 — 디자인

> English version: [`redis.md`](./redis.md)

이 문서는 `@nexusts/redis`의 아키텍처를 설명한다: 통합
`RedisClient` 인터페이스, 런타임 인식 adapter 선택, 그리고
session/cache/queue 모듈이 어떻게 의존하는지.

## 목표

1. **런타임 간 단일 `RedisClient` 인터페이스.** Bun의 내장 `Bun.redis`,
   Node.js의 `ioredis`, Cloudflare Workers KV — 모두 같은 minimal API
   뒤에.
2. **런타임 자동 감지.** 수동 config 없이 적절한 adapter 생성.
   `createRedisClient()`가 Bun, Node, Workers를 감지하고 매칭 구현
   반환.
3. **옵션 peer dependency.** `ioredis`는 Node에서만 필요. Bun과
   Workers adapter는 내장 API 사용 (zero deps).
4. **공유 기반.** `nexusts/session`, `nexusts/cache`, `nexusts/queue`
   모두 `RedisClient`에 의존하므로 단일 config switch가 세 모듈 모두의
   백엔드를 선택.

## 아키텍처

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

## `RedisClient` 인터페이스

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

의도적으로 minimal. 전체 Redis 명령 셋 (PUB/SUB, transactions,
streams 등)을 포함하지 않음. 필요한 사용자는 underlying adapter를 직접
사용 (`client.raw`).

`RedisSetOptions`는 `ex` (TTL 초)와 `nx`/`xx` (조건부 set) 포함.

## 런타임 감지

`detectRedisRuntime()`이 다음 중 하나 반환:

| 런타임 | 감지 조건 | Adapter | 외부 의존성 |
|--------|-----------|---------|------------|
| `bun` | `typeof Bun !== 'undefined'` | `BunRedisAdapter` | 없음 |
| `node` | `typeof process.versions.node !== 'undefined'` | `NodeRedisAdapter` | `ioredis` (옵션) |
| `cloudflare` | `typeof caches !== 'undefined'` | `CloudflareKVAdapter` | 없음 |
| `memory` | (fallback) | `MemoryRedisAdapter` | 없음 |

memory adapter는 항상 사용 가능 — 데이터를 `Map`에 저장. 런타임이
감지되지 않고 config가 없을 때 기본값. Redis 인스턴스 없이 테스트와
로컬 개발에 유용.

## Adapter 구현

### BunRedisAdapter

`Bun.redis` (Bun 내장) 래핑:

```ts
class BunRedisAdapter implements RedisClient {
  private client: ReturnType<typeof Bun.redis>;
  constructor(url: string) {
    this.client = Bun.redis(url);
  }
  // this.client.get/set/del/...에 위임
}
```

### NodeRedisAdapter

`ioredis` 래핑 (lazily 로드):

```ts
class NodeRedisAdapter implements RedisClient {
  private client: any; // ioredis 인스턴스
  constructor(opts: { url: string }) {
    // 동적 import — 실제 사용 시에만
    const Redis = await import('ioredis').then(m => m.default);
    this.client = new Redis(opts.url);
  }
}
```

### CloudflareKVAdapter

Workers KV 네임스페이스 래핑:

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

인-메모리 `Map` 기반 adapter, 항상 사용 가능.

## DI 통합

```ts
RedisModule.forRoot({
  url: process.env.REDIS_URL!,  // 생략 시 memory adapter
  // adapter: 'bun' | 'node' | 'cloudflare' | 'memory' (기본 자동 감지)
})
```

`RedisClient`를 `REDIS_CLIENT_TOKEN` 아래 등록:

```
ApplicationContainer
  └── ConfiguredRedisModule
        ├── REDIS_CLIENT_TOKEN (Symbol)
        └── "REDIS_CONFIG" (useValue: config)
```

Consumer는 `@Inject(REDIS_CLIENT_TOKEN)`로 주입받아 런타임에 적절한
adapter를 받음.

## 다른 모듈의 사용

| 모듈 | `RedisClient` 사용 |
|------|------------------|
| session | Session 저장소 (RedisSessionStore) |
| cache | Cache 저장소 (RedisCacheStore) |
| queue | Queue 백엔드 (아직 미구현) |

이 모듈들은 config에서 `RedisClient`를 받아 투명하게 사용. 사용자는
`createRedisClient()`로 한 번 adapter를 생성해 세 곳에 전달.

## Future work

- **Connection pool** — high-throughput 시나리오용 다중 연결.
- **TLS 지원** — Bun과 Node 모두에 `rediss://` URL 처리.
- **Cluster/Sentinel 지원** — Redis 클러스터에 투명 연결.
- **Pub/Sub** — 이벤트 브리지를 위한 타입드 `subscribe()`/`publish()`.

## 참고

- [`../user-guide/redis.ko.md`](../user-guide/redis.ko.md) — 사용자 가이드
- [`../design/session.ko.md`](../design/session.ko.md) — session 모듈
  (RedisClient 사용)
- [`../design/cache.ko.md`](../design/cache.ko.md) — cache 모듈
  (RedisClient 사용)
