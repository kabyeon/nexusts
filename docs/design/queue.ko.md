# Queue 모듈 설계

> 최종 업데이트: v0.1
> English version: [`queue.md`](./queue.md)

## 1. 목표

다음에서 동작하는 단일 통합 job API를 제공한다.

- **Bun / Node** + Redis (BullMQ)
- **Cloudflare Workers** + 플랫폼 네이티브 Queues
- **테스트 / 개발** + 인메모리 백엔드

세 가지 모두 동일한 `QueueBackend` 인터페이스를 사용하므로, 사용자 코드(포트, 테스트, 배포)는 어떤 것이 설정되어 있는지 알 필요가 없다.

## 2. 왜 직접 작성하지 않고 래핑하는가?

큐 시스템은 즉흥적인 구현이 제안하는 것보다 더 많은 움직이는 부분이 있다.

| 관심사 | 래핑하는 이유 |
| ------- | ----------- |
| Job 영구 저장 | Redis (BullMQ) 또는 플랫폼 디스크 (Cloudflare) |
| 재시도 + 백오프 | 정확히 구현하기 어려움 (exponential, jitter) |
| 지연 작업 | 스케줄러 필요 (BullMQ는 있음; Cloudflare는 `delaySeconds` 사용) |
| 동시성 / rate limiting | 두 라이브러리 모두 처리; 수동 구현은 오류 가능 |
| Idempotency | BullMQ의 `jobId` 옵션이 잘 테스트됨 |
| 가시성 / 메트릭 | 두 라이브러리 모두 대시보드 제공; 우리 일은 이벤트 노출 |
| 크로스 런타임 지원 | 하나의 코드 경로; 세 가지 런타임 |

래핑은 인증을 위해 `better-auth`에 적용한 것과 같은 논리다: 작은 추상화 비용을 지불하고 수천 줄의 보안 민감/운영 취약 코드를 절약한다.

## 3. 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                      사용자 코드                              │
│   QueueService.add('send-email', data)                        │
│   queue.process('send-email', handler)                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              @nexusts/queue  (별도 진입점)                       │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  QueueService    │  │ @OnQueueReady    │  │ invokeReady- │ │
│  │  (DI facade)     │  │ decorator        │  │ Hooks()      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────────┐                   │
│                    │   QueueBackend       │                   │
│                    │   (interface)        │                   │
│                    └──────────────────────┘                   │
│                              │                               │
│        ┌─────────────────────┼─────────────────────┐         │
│        ▼                     ▼                     ▼         │
│  ┌──────────┐          ┌──────────┐          ┌──────────┐    │
│  │  Memory  │          │  BullMQ  │          │Cloudflare│    │
│  │  (테스트) │          │  (Redis) │          │  (edge)  │    │
│  └──────────┘          └──────────┘          └──────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Redis / Workers runtime / in-process scheduler
```

파사드(`QueueService`)는 사용자 코드가 대화하는 유일한 대상이다. 백엔드는 교체 가능; `nx.config.ts`의 `backend: 'bullmq'`를 `'cloudflare'`로 변경하면 다른 것은 변경되지 않는다.

## 4. 모듈 분리

`@nexusts/queue`는 별도 진입점이다.

```json
"exports": {
  ".":      { ... },   // core
  "./cli":  { ... },
  "./auth": { ... },
  "./queue":{ ... }    // 새 모듈
}
```

빌드 스크립트는 `src/queue/index.ts`를 `dist/queue/` 아래 자체 아티팩트로 번들한다. 런타임은 백엔드별로 다른 peer 의존성을 필요로 하므로(BullMQ용 bullmq + ioredis, Cloudflare/인메모리는 추가 의존성 없음), 무거운 의존성을 `optional`로 유지하고 사용자가 필요한 것만 설치하도록 한다.

## 5. 백엔드 인터페이스

`QueueBackend` 인터페이스(`src/queue/types.ts`)는 모든 백엔드가 구현해야 하는 계약이다.

```ts
interface QueueBackend {
  readonly name: 'bullmq' | 'cloudflare' | 'memory';
  add(name, data, options?): Promise<AddedJob>;
  addBatch(jobs): Promise<AddedJob[]>;
  process<T>(name, handler, options?): Promise<WorkerHandle>;
  drain(): Promise<void>;
  stop(): Promise<void>;
  on(listener): () => void;
}
```

백엔드별 기능은 의도적으로 생략된다(BullMQ의 `priority`는 `AddOptions`에 숫자로만 노출; Cloudflare의 `MessageBatch.ackAll()`은 내부적으로 소비됨). 백엔드의 전체 표면이 필요한 고급 사용자는 `@Inject(QueueService)` 후 `svc.backend`에 직접 접근(특정 백엔드 타입으로 캐스팅).

## 6. Job 라이프사이클

```
add(name, data)
  │
  ▼
[ queue ] ─────────►  process(name, handler)
                       │
                       ▼
              ┌──────────────────┐
              │ handler(data,ctx)│
              └──────────────────┘
                       │
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
   { status: 'completed' }      { status: 'failed' }
        │                             │
        ▼                             ▼
    제거                       재시도 (`attempts`까지)
                                      │
                                      ▼
                              { status: 'failed', willRetry: false }
                                      │
                                      ▼
                                 dead-lettered
```

세 가지 반환 형상:

| 형상 | 의미 |
| ----- | ------- |
| `void` / 임의의 값 | `completed`로 처리되며 값이 `returnvalue` |
| `{ status: 'completed', returnvalue? }` | 성공 |
| `{ status: 'failed', error, willRetry }` | 실패; `willRetry`가 기본 재시도 정책 오버라이드 |
| `{ status: 'retry', reason?, delaySeconds? }` | 명시적 재시도 (BullMQ: `moveToDelayed`; Cloudflare: `message.retry`) |

던져진 에러는 잡혀서 기본 재시도 정책(`AddOptions.attempts`)으로 실패 처리된다.

## 7. 두 프로덕션 백엔드

### BullMQ (Redis)

| 관심사 | 동작 방식 |
| ------- | ------------ |
| 영구 저장 | Redis 리스트 + 해시 (`bull:<queue>:<name>:*`) |
| 지연 작업 | 타임스탬프 점수를 가진 정렬된 셋 |
| 재시도 | `attempts` + `backoff` (fixed/exponential) |
| Rate limit | 큐당 `limiter: { max, duration }` |
| 동시성 | 워커당 `concurrency` (기본값: 1) |
| Idempotency | `jobId` 옵션 — 같은 ID = no-op |

`FlowProducer`가 아닌 하이레벨 `Queue.add(name, data, opts)` API를 사용하므로 사용자 코드가 단순하게 유지된다. 파워 유저는 `svc.backend`(`BullMQBackend`로 캐스팅)에 접근하여 로우레벨 API를 사용할 수 있다.

### Cloudflare Queues (Workers)

| 관심사 | 동작 방식 |
| ------- | ------------ |
| 영구 저장 | Cloudflare 플랫폼 (Redis 불필요) |
| 프로듀서 | `queue.send(body, { delaySeconds })` |
| 컨슈머 | Worker의 `queue(batch, env, ctx)` export |
| 지연 작업 | send 시 `delaySeconds` (최대 24시간) |
| 동시성 | `wrangler.toml`의 `max_batch_size` |
| Idempotency | 내장되지 않음; 워커 측에서 중복 제거 |

프로듀서 / 컨슈머 분리가 까다로운 부분이다: 우리 `add()`와 `process()` API는 Cloudflare의 `send`와 `MessageBatch`에 1:1로 매핑되지 않는다. 다음과 같이 해결한다:

- send 시 각 작업을 `{ name, data, jobId, options }`로 래핑.
- `CloudflareQueueBackend.consumerHandler()`를 노출하여 각 `Message`를 해당 `name`의 등록된 핸들러로 디스패치.
- Worker의 `queue()` export가 `consumerHandler(batch)`를 호출.

```ts
// src/worker.ts
const app = new Application(AppModule);
const queue = app.container.resolve(QueueService);
const backend = queue.getCloudflareBackend();
if (backend) backend.bind(env);   // env에서 Queue 바인딩

export default {
  fetch: app.fetch,
  async queue(batch, env, ctx) {
    const cf = app.container.resolve(QueueService).getCloudflareBackend();
    if (cf) cf.bind(env);
    return cf?.consumerHandler()(batch);
  },
};
```

이 간접 참조가 필요한 이유는 Workers가 요청 사이에 isolate를 해체하기 때문 — 장기 실행 `process()` 호출이 없다. 들어오는 각 batch는 새로운 호출이다.

## 8. 인메모리 백엔드

`vitest`와 Redis 설정 전 `bunx nx dev` 용:

- 100ms마다 틱.
- `delaySeconds`, `attempts`, `backoff` (exponential) 존중.
- 단일 프로세스; 프로덕션용 아님.
- `process()`는 즉시 반환 (Worker 인스턴스 없음); 작업은 다음 틱에서 픽업.
- `drain()`은 진행 중인 작업을 기다림.

메모리 백엔드의 틱 인터벌은 unref되어 테스트에서 Node를 활성 상태로 유지하지 않는다.

## 9. `@OnQueueReady` 라이프사이클

`@OnQueueReady` 데코레이터 + `invokeQueueReadyHooks(instance)`는 워커에게 부팅 시 깔끔하게 등록하는 방법을 제공한다.

```ts
@Injectable()
class EmailWorker {
  constructor(@Inject(QueueService.TOKEN) private queue: QueueService) {}

  @OnQueueReady()
  async register() {
    await this.queue.process('send-welcome-email', this.handle);
  }
}
```

데코레이터는 `propertyKey`를 클래스의 `nexus:queue:ready-hooks` 메타데이터 슬롯에 쓴다. `invokeQueueReadyHooks`는 해당 메타데이터를 읽고 각 훅을 호출한다. `Application.start()`에 아직 자동 연결하지 않은 이유는 워커가 사용자가 수동으로 resolve해야 하는 자식 컨테이너에 있을 수 있기 때문 — 미래 릴리스에서 추가될 예정.

## 10. 이벤트

백엔드는 모든 상태 변경에 `QueueEvent`를 발생시킨다.

| 종류 | 시점 |
| ---- | ---- |
| `job:added` | `add()` 반환 후 |
| `job:active` | 워커가 작업을 픽업할 때 |
| `job:completed` | 성공 시 |
| `job:failed` | 실패 시 (`willRetry` 포함) |
| `worker:started` | `process()` 성공 시 |
| `worker:stopped` | `close()` 호출 시 |

리스너는 `queue.on(listener)`로 구독한다. NexusTS 이벤트 시스템(v0.2) 및 메트릭 익스포터의 통합 지점이다.

## 11. DI 통합

```
ApplicationContainer
  └── ConfiguredQueueModule (QueueModule.forRoot(config)가 반환)
        ├── QueueService
        ├── QueueService.TOKEN (useExisting 별칭)
        └── 'QUEUE_CONFIG' (useValue)
```

서비스는 `AuthService` 패턴을 따라 클래스 토큰과 `QueueService.TOKEN` Symbol 양쪽에 등록된다.

## 12. 설정 형상

사용자 대상 설정(`nx.config.ts`에서 파싱)은 런타임 설정과 1:1로 매핑된다.

```ts
interface QueueConfig {
  backend: 'bullmq' | 'cloudflare' | 'memory';
  bullmq?: {
    connection: string | { host: string; port: number; password?: string };
    prefix?: string;
  };
  cloudflare?: {
    bindingName: string;
    queueName?: string;
  };
  defaults?: AddOptions;
}
```

모든 백엔드 옵션을 표현하려고 하지 않는다 — 공통 `QueueBackend` 인터페이스와 일치하는 것만. 백엔드별 튜닝은 사용자 코드에서 발생(`svc.backend` 캐스팅).

## 13. CLI 통합

`nx make:queue <Name>`은 다음을 생성한다.

- `src/queue/workers/<name>.worker.ts` — `@OnQueueReady` 핸들러
- `src/queue/jobs/<name>.job.ts` — `enqueue()` / `enqueueBatch()` 헬퍼

워커 템플릿은 핸들러를 try/catch로 감싸고 올바른 `JobResult` 형상을 반환하여 재시도가 즉시 동작한다. Job 템플릿은 단순히 `queue.add`에 위임하여 호출 사이트를 인체공학적으로 만든다.

```ts
// src/controllers/checkout.controller.ts
await this.checkoutJob.enqueue({ userId, cart });
```

CLI의 `make:queue --backend bullmq`는 `--backend`가 전달되지 않으면 `nx.config.ts`의 백엔드 선택을 재사용한다.

## 14. 테스트 전략

- 인메모리 백엔드의 **단위 테스트** (Redis나 Workers 없이).
- `QueueService` DI + `add` / `process` / `stop` 흐름의 **통합 테스트**.
- **@OnQueueReady 테스트** — 인스턴스에서 훅을 호출하고 부수 효과 검증.
- **검증 테스트** — 연결 없는 `forRoot({ backend: 'bullmq' })`가 resolve 시 throw.

BullMQ와 Cloudflare별 동작은 기본 라이브러리 레벨에서 테스트된다(우리가 래핑하는 것을 다시 테스트하지 않음). 테스트는 **NexusTS 통합 지점**에 집중한다.

## 15. 알려진 이슈

### ioredis v5 + Bun

`ioredis@5`는 Bun에서 동작하지만 BullMQ가 올바르게 동작하려면 `maxRetriesPerRequest: null`이 필요하다(연결이 워커와 공유되며, BullMQ가 이를 비활성화하기 위해 이 값을 요구). 우리 래퍼는 이를 자동으로 설정한다.

### Cloudflare `bind()` race

`CloudflareQueueBackend.bind(env)`는 첫 `add()` 전에 호출되어야 한다. 우리는 Worker의 `queue()` export에서(`app = new Application(...)` 직후) 이를 수행한다. 바인딩을 잊으면 명확한 에러가 발생: `"[queue/cloudflare] bind() must be called before add()"`.

### 테스트 인체공학

인메모리 백엔드의 틱 인터벌(100ms)은 테스트를 동기 큐보다 약간 느리게 만든다. 큐를 동기적으로 비우는 "flush" API를 노출하는 것을 고려했지만, 이는 실제 백엔드와 다르게 동작할 것이다. 대신 테스트는 `add()` 후 `await new Promise(r => setTimeout(r, 250))`로 틱이 디스패치할 시간을 준다.

## 16. 향후 작업

- **스트리밍 작업** — websocket에 진행 이벤트를 방출하는 장기 실행 작업 (BullMQ Pro 기능).
- **Cron / 스케줄링 작업** — 일회성 `add({ delaySeconds: ... })`로 전환되는 일급 `@Scheduled(cron)` 데코레이터.
- **작업 체인** — 각 작업이 이전 작업의 출력에 의존하는 `addBatch([a, b, c])`.
- **Dead-letter 큐 (DLQ)** — 영구 실패한 작업을 별도 큐로 자동 라우팅.
- **Better-auth 후크** — `user.created` 이벤트를 듣고 환영 이메일을 enqueue.

## 17. 참고

- [`queue.md`](../user-guide/queue.md) — 사용자 가이드
- [BullMQ 문서](https://docs.bullmq.io/)
- [Cloudflare Queues 문서](https://developers.cloudflare.com/queues/)
- [`auth.md`](./auth.md) — 같은 패턴의 자매 설계 문서
