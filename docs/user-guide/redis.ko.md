# Redis · `@kabyeon/nexusjs/redis` (v0.5)

> English: [`redis.md`](./redis.md)
> v0.5 신규. 새로운 `redis` / `cloudflare-kv` 세션 및 캐시 백엔드를
> 구동하는 런타임 인식 Redis 호환 키/값 클라이언트.

`@kabyeon/nexusjs/redis`가 제공하는 것:

- **`createRedisClient(config)`** — `config.adapter`가 생략되면
  런타임 자동 감지.
- **`RedisClient`** — 모든 어댑터가 구현하는 최소 인터페이스.
- **세 가지 런타임 어댑터** + 인-프로세스 `memory` 어댑터:

  | 어댑터 | 런타임 | 외부 의존성 |
  | ------ | ------ | ----------- |
  | `bun` | Bun | 없음 (`Bun.redis` 내장) |
  | `node` | Node.js | `ioredis` (옵션 peer) |
  | `cloudflare` | Cloudflare Workers | 없음 (Workers KV) |
  | `memory` | 모든 환경 / 테스트 | 없음 |

- **`RedisModule.forRoot(config)`** — DI 컨테이너에 클라이언트 연결.

`@kabyeon/nexusjs/session` (Redis + Cloudflare KV 세션 백엔드) 및
`@kabyeon/nexusjs/cache` (Redis 캐시 스토어)가 내부적으로 사용. 다른
용도(rate limiter, queue 검사, pub/sub 등)로도 직접 사용 가능.

---

## 1. 빠른 시작

```ts
import { Module, Inject } from "@kabyeon/nexusjs";
import { createRedisClient, RedisClient, REDIS_CLIENT_TOKEN, RedisModule } from "@kabyeon/nexusjs/redis";

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

또는 DI 없이 직접:

```ts
const redis = createRedisClient();           // 자동 감지
const redis = createRedisClient({ adapter: "bun", url: "redis://localhost:6379" });
const redis = createRedisClient({ adapter: "node", url: "redis://..." });
const redis = createRedisClient({ adapter: "cloudflare" });
```

---

## 2. 런타임 자동 감지

`detectRedisRuntime()`이 현재 런타임에 맞는 어댑터 반환.
`config.adapter`가 생략된 경우 `createRedisClient()`이 이를 사용.

| 런타임 | 어댑터 |
| ------ | ------ |
| Bun | `bun` (`Bun.redis` 사용) |
| Node.js | `node` (`ioredis` 사용) |
| Cloudflare Workers / Pages | `cloudflare` (Workers KV 사용) |
| 기타 | `memory` (인-프로세스; 테스트 / 단일 프로세스 dev에 유용) |

명시적으로 강제 가능:

```ts
const redis = createRedisClient({ adapter: "memory" }); // 테스트용
const redis = createRedisClient({ adapter: "node" });   // Node 강제
```

---

## 3. `RedisClient` API

인터페이스는 의도적으로 최소 — `@kabyeon/nexusjs/session`과 `@kabyeon/nexusjs/cache`가
필요로 하는 것만. 미래 모듈(limiter, queue)도 자체 클라이언트
셰이프를 다시 정의하지 않고 채택 가능.

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

### 왜 이 셰이프인가?

- **`get` / `set` / `del` / `exists`** — 모든 캐시와 세션 백엔드가
  필요로 하는 4가지 연산. Bun / Node / Cloudflare 어댑터가 모두
  네이티브 동등물로 매핑.
- **`ex` 옵션이 있는 `incr`** — TTL이 있는 원자적 카운터 생성.
  Cloudflare에서는 read-modify-write로 구현 (KV에는 원자적 INCR
  없음). 고경합 카운터는 실제 Redis 사용.
- **`scan`** — Redis에는 SCAN MATCH, Cloudflare KV에는
  `KV.list({ prefix })` (Cloudflare 특정 glob; prefix만 지원).
  `cursor`는 Cloudflare 어댑터에서 opaque string, Redis 어댑터에서
  number. `cursor === "0"`이 될 때까지 반복.

### 키 prefix

앱 / 환경별로 키를 네임스페이스하기 위해 prefix 설정. `get` /
`set` / `del` 호출에 prepend되고 `scan` 결과에서 strip됨.

```ts
const redis = createRedisClient({
  adapter: "bun",
  url: "redis://localhost:6379",
  keyPrefix: "myapp:prod:",
});
await redis.set("user:42", "alice");   // "myapp:prod:user:42"로 저장
const res = await redis.scan({ match: "myapp:prod:user:*" });
// res.keys = ["user:42"]   (prefix strip)
```

---

## 4. `@kabyeon/nexusjs/session` 통합

`SessionModule.forRoot({ backend: "redis", redis: { client, keyPrefix } })`가
내부적으로 `RedisSessionStorage` 사용. Bun, Node 또는 `RedisClient`가
있는 모든 런타임에서 같은 코드 경로가 작동.

```ts
import { SessionModule } from "@kabyeon/nexusjs/session";
import { createRedisClient } from "@kabyeon/nexusjs/redis";

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

Cloudflare Workers에서는 `CloudflareKVAdapter`를 Redis 어댑터 대신
전달. `SessionService`는 같은 코드 경로 사용.

```ts
import { SessionModule } from "@kabyeon/nexusjs/session";
import { CloudflareKVAdapter } from "@kabyeon/nexusjs/redis";

export default {
  async fetch(req: Request, env: Env) {
    const adapter = new CloudflareKVAdapter({ kv: env.SESSIONS });
    // ... adapter를 세션 모듈에 전달.
  },
};
```

또는 `SessionModule.forRoot({ backend: "cloudflare-kv", cloudflareKv: { client, keyPrefix } })`
호출. 명시적 전달이 없으면 프레임워크가 `c.env.KV` 바인딩을 자동 감지.

---

## 5. `@kabyeon/nexusjs/cache` 통합

`RedisCacheStore`는 `RedisClient`를 사용하는 `CacheStore` 구현.
태그 기반 무효화 지원.

```ts
import { CacheService } from "@kabyeon/nexusjs/cache";
import { RedisCacheStore, createRedisClient } from "@kabyeon/nexusjs/redis";

const cache = new CacheService({
  store: new RedisCacheStore(createRedisClient({ url: process.env.REDIS_URL! })),
});

await cache.set("user:42", user, { ttl: 60, tags: ["user:42"] });
await cache.invalidateByTag("user:42");
```

---

## 6. ioredis는 옵션 peer dep

Bun 앱과 Cloudflare Workers 앱은 **새 의존성 불필요**.
`adapter: "node"`를 타겟하는 Node 앱은 `ioredis` 필요:

```bash
bun add ioredis
```

이 패키지는 `package.json`에서 `optional` peer dep으로 나열되어 있어,
Node 어댑터를 사용하지 않는 앱은 설치할 필요 없음.

---

## 7. 설정

```ts
interface RedisConfig {
  adapter?: "bun" | "node" | "cloudflare" | "memory";
  url?: string;                          // default: REDIS_URL 또는 redis://localhost:6379
  keyPrefix?: string;                    // default: ""
  defaultTtlSeconds?: number;            // default: 0 (TTL 없음)
  kv?: KVNamespaceLike;                   // Cloudflare 전용: KV 바인딩
  nodeOptions?: Record<string, unknown>;  // Node 전용: ioredis 옵션
}
```

---

## 8. 참고

- [`./session.md`](./session.md) — `SessionModule` + 새로운
  `redis` / `cloudflare-kv` 백엔드.
- [`./cache.md`](./cache.md) — `CacheService` + `RedisCacheStore`.
- [Bun Redis 문서](https://bun.sh/docs/api/redis)
- [ioredis on npm](https://www.npmjs.com/package/ioredis)
- [Cloudflare Workers KV 문서](https://developers.cloudflare.com/workers/runtime-apis/kv/)
