# 변경 로그

NexusJS의 모든 주요 변경 사항이 이 파일에 기록됩니다.

이 파일은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며,
[시맨틱 버전](https://semver.org/lang/ko/spec/v2.0.0.html)을 준수합니다.

> English version: [`CHANGELOG.md`](./CHANGELOG.md)

---

## [0.5.0] — 2026-06-23

v0.5는 **실시간** 마일스톤. 프레임워크가 Bun (기본) 및 Node.js
(`ws` 패키지 경유)에서 작동하는 통합 WebSocket API를 획득. 단일
데코레이터 기반 게이트웨이 패턴. 프레임워크는 이제 23개 모듈 제공
(v0.4에서 22개에서 증가).

### 추가 · `nexus/ws`

`nexus/ws`는 Hono의 런타임별 WebSocket 지원에 대한 단일 관용적 API 제공.

- **`@WebSocketGateway(path)`** — 클래스 데코레이터. 클래스를 WebSocket 게이트웨이로 표시. 프레임워크가 `<path>`에 Hono `upgradeWebSocket` 핸들러 설치.
- **`@OnWebSocketOpen()`, `@OnWebSocketMessage()`, `@OnWebSocketClose()`, `@OnWebSocketError()`** — 메서드 데코레이터 팩토리. 라이프사이클 이벤트를 특정 메서드에 바인딩.
- **`WebSocketService`** — DI 친화적 서비스. 연결 추적, rooms, broadcasting.
- **`WebSocketClient`** — `id`, `rooms`, `data`, `send()`, `close()`, `joinRoom()` / `leaveRoom()`을 가진 per-connection 래퍼.
- **런타임 자동 감지** — Bun은 자동 감지. Node에서 프레임워크는 `ws` 패키지 (optional peer dep)를 lazy-import.
- **`BunWsAdapter`** — Hono의 `createBunWebSocket`을 래핑하여 `Bun.serve()`용 `websocket` config 객체 반환.
- **`NodeWsAdapter`** — `ws` 패키지 래핑, `http.Server.upgrade` 이벤트용 `handleUpgrade` 함수 반환.
- **Rooms** — `joinRoom`, `leaveRoom`, `broadcastToRoom`, `getRoomMembers`. Room은 비면 자동 정리.
- **Broadcast** — `broadcast(data, filter?)`는 모든 열린 클라이언트에 도달; `sendTo(id, data)`는 한 명에 도달.

### 추가 · API surface

```ts
@Injectable()
@WebSocketGateway("/ws")
class ChatGateway {
  constructor(@Inject(WEBSOCKET_SERVICE_TOKEN) private ws: WebSocketService) {}

  @OnWebSocketOpen()
  onOpen(client: WebSocketClient) { this.ws.joinRoom(client, "lobby"); }

  @OnWebSocketMessage()
  onMessage(client: WebSocketClient, data: { text: string }) {
    this.ws.broadcastToRoom("lobby", { user: client.id, text: data.text });
  }

  @OnWebSocketClose()
  onClose(client: WebSocketClient) { this.ws.leaveAllRooms(client); }
}

@Module({ imports: [WebSocketModule.forRoot({ gateways: [ChatGateway] })] })
class AppModule {}
```

### 추가 · Auth 패턴

Sub-protocol 토큰, 세션 쿠키 (기존 `nexus/session` 미들웨어),
또는 first-message handshake를 통한 WebSocket 인증. 자세한 가이드는
`docs/user-guide/ws.md` 참조.

### 변경

- 패키지 버전 0.5.0으로 bump.
- 신규 번들 entry point: `./ws`. 23 entry points 합계;
  46 runtime files emitted to `dist/`.

### 추가 · CLI

- 신규 `nx repl` 명령 (별칭: `console`, `shell`). 사용자의
  AppModule을 boot하고 `app`, `container`, `db`, `logger`,
  `cfg`, `cache`, `events`이 사전 로드된 대화형 REPL로 진입.
  다중 행 입력 (bracket-matching), async 코드, history
  (영구 저장), dot-commands 지원: `.help`, `.exit`,
  `.services`, `.modules`, `.routes`, `.history`, `.clear`,
  `.reset`. raw REPL을 원하면 `--no-boot` 사용.

### 변경 · CLI

- `nx migrate`는 이제 `nx db:migrate`. 이전 이름은 하위 호환을
  위해 여전히 별칭으로 작동; 새 짧은 별칭은 `nx db:m`.
- 신규 `nx db:seed` 명령 (별칭: `db:s`, `seed`)이 `db/seeds/`
  (nx.config.ts의 `paths.seeds`로 설정 가능)의 모든 시드
  파일 실행. 서브 플래그: `--file <name>`로 단일 시드 실행,
  `--create <name>`로 시드 파일 스캐폴드, `--reset`로 모든
  테이블 truncate 후 시드 실행 (파괴적).

### 의존성

- **`nexus/ws`의 optional peer dep**:
  - `ws` (^8.18.0) — Node 런타임에서만. Bun 앱은 불필요.

### 문서

- 신규 가이드 `docs/user-guide/ws.md` (영문) + `ws.ko.md` (한글):
  빠른 시작 (Bun 및 Node), `WebSocketService` API, `WebSocketClient` 래퍼,
  인증 패턴, heartbeat, Cloudflare Workers 통합 레시피, 설정 레퍼런스.
- 갱신:
  - `docs/README.md` — 모듈 표가 23 항목.
  - `docs/api-reference.md` — 신규 `nexus/ws` 섹션.
  - `README.md` — 모듈 수 22 → 23; 로드맵 갱신.

### 검증 (v0.5)

- **490 / 490 tests pass** in 2.71s (v0.3 이전부터 존재한
  `tests/validation`, `tests/e2e`, `tests/config`의 실패 제외). v0.4의
  464에서 +26 신규.
- `tsc --noEmit` clean.
- 23 bundle entry points; 46 runtime files emitted to `dist/`.

### 추가 · `nexus/redis`

런타임 인식 Redis 호환 키/값 클라이언트. 새로운 `redis` 및
`cloudflare-kv` 세션/캐시 백엔드를 구동. 세 가지 런타임 어댑터
(+ 인-프로세스 `memory`):

- **`bun`** — 내장 `Bun.redis` 사용 (추가 패키지 없음).
- **`node`** — `ioredis` 사용 (이제 옵션 peer dep).
- **`cloudflare`** — Cloudflare Workers KV 사용 (추가 패키지 없음;
  Workers / Pages 런타임에 이상적).
- **`memory`** — 인-프로세스 맵 (테스트 및 단일 프로세스 dev용).

런타임에서 자동 감지. 네 어댑터 모두 동일한 `RedisClient`
API를 가지므로 키/값 저장소가 필요한 모든 모듈이 같은
클라이언트 셰이프 사용 가능.

### 추가 · `nexus/session` — Redis & Cloudflare KV 백엔드

`SessionModule.forRoot({ backend: "redis", redis: { client, keyPrefix } })`가
새 `RedisSessionStorage` 사용 (Bun, Node 또는 `RedisClient`를
노출하는 모든 런타임에서 작동). Cloudflare Workers의 경우
`CloudflareKVAdapter` 전달 후 `backend: "cloudflare-kv"` 사용.
사용자별 세션 인덱스 자동 유지; `gc()`가 고아 정리.

### 추가 · `nexus/cache` — Redis 캐시 스토어

`RedisCacheStore`는 `RedisClient`를 래핑하는 `CacheStore`. 태그
기반 무효화는 `gc()`가 정리하는 태그별 인덱스를 통해 지원. 같은
설정이 Bun (`Bun.redis`), Node (`ioredis`), Cloudflare Workers (KV)에서 작동.

### v0.4에서 마이그레이션

대부분의 v0.4 코드는 변경 없이 v0.5와 호환됨. 본 릴리스의 breaking
change 없음. 신규 `nexus/ws` 모듈은 opt-in — WebSocket이 필요할 때만
설치 (Node에서는 `ws` 패키지도).

---

## [0.4.0] — 2026-06-22

v0.4는 **관측 가능성과 개발자 경험** 마일스톤입니다. NestJS / AdonisJS
기능 분석의 모든 "Tier 1" 및 "Tier 2" 격차가 해소되었습니다. 프레임워크는 이제
22개 모듈을 제공합니다 (v0.3에서 17개에서 증가).

### 추가 · 모듈

v0.4에서 **6개의 신규 모듈**이 추가되었습니다:

| 모듈 | Tier | 목적 |
| ------ | ---- | ------- |
| `nexus/openapi` | 1 | OpenAPI 3.1 스펙 생성 + Scalar UI. `@Validate({body,query,params,headers})` Zod 스키마에서 자동 도출. |
| `nexus/upload` | 1 | 멀티파트 파일 업로드 헬퍼. `UploadService`가 `multipart/form-data` 파싱, 크기 / MIME / 개수 검증. `@Upload()` / `@UploadedFile()` / `@UploadedFiles()` 데코레이터. |
| `nexus/sse` | 2 | Server-Sent Events. `SseStream`이 Hono의 `SSEStreamingApi`를 pending-write 트래킹과 함께 래핑. `sse(c, handler)` 헬퍼. `onClose()` cleanup. |
| `nexus/tracing` | 2 | OpenTelemetry 분산 추적. `TracingService`, `TracingModule.forRoot()` (lazy OTel SDK), `@Trace()` 데코레이터, W3C + B3 전파, Hono 자동 계측. |
| `nexus/metrics` | 2 | Prometheus / OpenMetrics. `Counter` / `Gauge` / `Histogram` / `Summary`, 라벨, content negotiation이 가능한 `/metrics` 엔드포인트. `@Counted()` / `@Timed()` 데코레이터. |
| (코어) **Request-scoped DI** | 2 | `@Injectable({ scope: 'request' })` provider 옵션. Hono 미들웨어가 `AsyncLocalStorage`로 요청별 scope 활성화. `getRequest()` / `getRequestScope()` / `getRequestState()` 헬퍼. `REQUEST` 및 `REQUEST_SCOPE` 토큰. |

### 추가 · Tracing

`nexus/tracing`은 OpenTelemetry API의 얇고 관용적인 래퍼. Bun-native 앱용 설계:

- **Lazy SDK 로딩.** `@opentelemetry/api`는 유일한 필수 의존성 (~7kb). SDK 패키지들(`sdk-node`, `exporter-trace-otlp-http`, `resources`, `semantic-conventions`)은 optional peer dep이며, `TracingModule.forRoot()`가 dynamic-import.
- **`@Trace()` 데코레이터** — 메서드를 span으로 감쌈. `AsyncFunction` 감지로 sync 메서드는 sync로 유지.
- **`withSpan()` / `withSpanSync()`** — 수동 span 헬퍼.
- **W3C + B3 전파** — `parseTraceParent`, `formatTraceParent`, `extractB3Context`. `extractContext()` / `injectContext()` 헬퍼.
- **Hono 자동 계측** — 들어오는 `traceparent` 추출, `http.method` / `http.route` / `http.target` / `http.user_agent` / `http.client_ip` / `http.status_code` 속성을 가진 `SERVER` span 시작.
- **기본 no-op.** `forRoot()` 없이는 `TracingService`가 OTel의 no-op tracer 사용; `@Trace()`는 투명한 pass-through.

### 추가 · Metrics

`nexus/metrics`는 **외부 의존성 0**인 Prometheus 호환 메트릭 수집 라이브러리 (gzipped ~5kb).

- **4가지 메트릭 타입** — `Counter`, `Gauge`, `Histogram`, `Summary`.
- **라벨** — 메트릭별 `labelNames`, observation 시점에 검증.
- **기본 버킷** — Prometheus 표준 `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`.
- **기본 백분위** — `Summary`의 `[0.5, 0.9, 0.99]`.
- **`/metrics` 엔드포인트** — `MetricsModule.forRoot()`가 자동 마운트. `Accept` 헤더로 content negotiation (Prometheus는 `text/plain; version=0.0.4`, OpenMetrics는 `application/openmetrics-text; version=1.0.0`).
- **기본 Node.js 프로세스 메트릭** — `process_start_time_seconds`, `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_seconds` 등 (총 10개 gauge, scrape 시점에 실행되는 `collect()` 콜백).
- **글로벌 라벨** — `service`, `region` 등이 모든 메트릭에 prepend.
- **`@Counted()` / `@Timed()` 데코레이터** — 메서드 호출 시 자동 기록. sync 메서드는 sync로 유지.
- **`getOrCreate*` 헬퍼** — 데코레이터 사용 시, 다른 라벨 셋으로 동일 메트릭을 여러 메서드에서 observe할 때 "metric already registered" 에러 회피.

### 추가 · Request-scoped DI

오랫동안 요청받은 기능. DI 컨테이너가 이제 세 가지 provider scope 지원:

| Scope | 수명 | 사용 사례 |
| ----- | -------- | -------- |
| `singleton` (기본) | 앱 수명 | 무상태 서비스 |
| `request` | 단일 HTTP 요청 | 멀티테넌트 컨텍스트, 감사 로깅, request-id 전파 |
| `transient` | resolve당 | for-each, 일회용 워커 |

프레임워크가 `AsyncLocalStorage`로 요청별 scope를 활성화하는 Hono 미들웨어 설치. 서비스 코드는 호출 트리 어디서나 활성 요청을 읽을 수 있음:

```ts
import { getRequest, getRequestState, REQUEST, Inject, Injectable } from "nexus";

@Injectable({ scope: "request" })
class RequestContext {
  id = crypto.randomUUID();
  userId: string | null = null;
  constructor(@Inject(REQUEST) public req: any) { ... }
}

// 호출 트리 깊숙이:
function audit() {
  const ctx = getRequestState<MyAuditData>("audit");
  // ...
}
```

### 추가 · OpenAPI

`nexus/openapi`는 OpenAPI 3.1 스펙을 생성하고 모던 Scalar UI로 제공.

- **`@Validate({body,query,params,headers})` Zod 스키마에서 자동 도출** — 스키마를 두 번 선언할 필요 없음.
- **Zero-dep zod-to-JSON-schema 변환기** — zod 3.25+ 내부 `_def` 구조 처리 (literal `value`, enum `values`, function-style `shape()`).
- **데코레이터** — `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiParam`, `@ApiQuery`, `@ApiSecurity`, `@ApiExclude`, `@ApiProperty`, `@ApiSchema`.
- **Scalar UI** — jsDelivr CDN에서 로드 (asset 번들링 없음).
- **`GET /openapi.json` + `GET /docs`** — 스펙과 UI.

### 추가 · Upload

`nexus/upload`는 Hono의 `c.req.parseBody()` 기반의 얇고 관용적인 멀티파트 업로드 헬퍼. Bun의 `Blob`과 Node의 `File` 타입을 투명하게 수용.

- **`@Upload('field', opts)`** — 라우트별 설정.
- **`@UploadedFile('field')` / `@UploadedFiles('field')`** — 파라미터 주입.
- **검증** — `maxFileSize` (기본 10MB), `maxFiles` (기본 5), `allowedMimeTypes` (`image/*` 와일드카드 지원).
- **에러** — `FILE_TOO_LARGE`, `MIME_NOT_ALLOWED`, `MISSING_FIELD`, `TOO_MANY_FILES` (모두 400 반환).
- **`nexus/drive` 통합 옵션** — `driveToken` + `drivePrefix`로 업로드를 `DriveService` 버킷에 직접 파이프.

### 추가 · SSE

`nexus/sse`는 보장된 delivery semantics를 가진 Hono의 `SSEStreamingApi` 래퍼 `SseStream` 제공.

- **`sse(c, handler)` 헬퍼** — Hono 컨텍스트가 첫 번째 인자.
- **Pending-write 트래킹** — `SseStream.send()`가 `api.writeSSE()` promise를 트래킹; `close()`가 `Promise.allSettled()`를 await하여 `close()` 이전의 모든 `send()`가 클라이언트에 도달.
- **`getLastEventId(c)`** — 재연결 지원.
- **`onClose(cb)`** — cleanup (명시적 close 또는 Hono의 `onAbort` 통한 클라이언트 disconnect 시 발화).

### 변경 · deprecated 항목 제거

`@CurrentSession` 및 `CurrentSessionOptions`은 v0.2에서 deprecated (각각 `@Session` 및 `SessionOptions`로 이름 변경). deprecation shim이 **v0.4에서 제거**; 이제 v0.2 이름만 export.

```diff
- import { CurrentSession } from "nexus/session";
+ import { Session } from "nexus/session";

- add(@CurrentSession() session) { ... }
+ add(@Session() session) { ... }
```

### 변경 · Build

- 번들 수: 17 → 22 entry points. 34 → 44 runtime files.
- 신규 번들 entry points: `./openapi`, `./upload`, `./sse`, `./tracing`, `./metrics`. (Request-scoped DI는 `core`와 함께 출시.)
- TypeScript: `strict: true`; experimental decorators 활성화.

### 의존성

- **`nexus/tracing`의 optional peer dep**:
  - `@opentelemetry/api` (항상 필요, ~7kb)
  - `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`,
    `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`
    (`TracingModule.forRoot()` 호출 시에만)
- **신규 필수 의존성 없음.** `nexus/metrics`는 runtime dep 없음. `nexus/upload` / `nexus/openapi` / `nexus/sse`는 이미 있는 `hono`와 `zod`만 사용.

### 문서

- 신규 가이드 (영문 + 한글):
  - `docs/user-guide/openapi.md`
  - `docs/user-guide/upload.md`
  - `docs/user-guide/sse.md`
  - `docs/user-guide/tracing.md`
  - `docs/user-guide/request-scope.md`
  - `docs/user-guide/metrics.md`
- 갱신:
  - `docs/README.md` — 모듈 인덱스에 22개 항목.
  - `docs/api-reference.md` — 22개 모듈의 API surface.
  - `docs/user-guide/getting-started.md` — v0.4 quickstart.
  - `docs/design/architecture.md` — v0.4 layer diagram.
  - `docs/analysis/nestjs-comparison.md` — §4.3 (request-scoped DI),
    §4.4 (OpenTelemetry), §4.5 (Prometheus metrics) 모두 "closed in v0.4"로 표시. "Closed in v0.3" 표는 18행 (이전 14).
  - `docs/analysis/adonisjs-comparison.md` — v0.4로 재기준.

### 검증 (v0.4)

- **464 / 464 tests pass** in 2.67s (v0.3 이전부터 존재한 `tests/validation`,
  `tests/e2e`, `tests/config`의 실패 제외). v0.3의 322에서 +142 신규.
- `tsc --noEmit` clean.
- 22 bundle entry points; 44 runtime files emitted to `dist/`.

### v0.3에서 마이그레이션

대부분의 v0.3 코드는 변경 없이 v0.4와 호환됩니다. 유일한 breaking change:

1. **`@CurrentSession`을 `@Session`으로 교체.** v0.1 alias는 v0.2에서 deprecated되었고 이제 제거됨.

```ts
// v0.3
import { CurrentSession } from "nexus/session";
class C {
  add(@CurrentSession() session) { ... }
}

// v0.4
import { Session } from "nexus/session";
class C {
  add(@Session() session) { ... }
}
```

이게 전부. 다른 모든 v0.3 API는 v0.4에서 변경 없이 작동.

---

## [0.3.0] — 2026-06-21

v0.3는 **production-ready** 마일스톤. NestJS / AdonisJS 기능 분석의 모든
"Tier 1" 격차가 해소되었고, 기본 ORM (Drizzle)이 모든 DB 의존 모듈에 연결됨.

### 추가 · 모듈

프레임워크는 이제 **17개 모듈**을 제공 (v0.2에서 7개에서 증가). 모든 신규 모듈은 자체 번들 entry point — 필요한 것만 설치.

| 모듈 | 번들 entry | 목적 |
| ------ | ------------ | ------- |
| `nexus/health` | `nexus/health` | Liveness / readiness / startup 엔드포인트. 내장 indicator: memory, disk, HTTP, Drizzle DB probe. |
| `nexus/config` | `nexus/config` | Zod 검증 설정. 레이어 로딩 (process.env → `.env` → `load()` → schema). |
| `nexus/logger` | `nexus/logger` | Pino 기반 구조화 로깅. dev에서는 pretty-print, prod에서는 JSON. AsyncLocalStorage로 request-scoped. |
| `nexus/static` | `nexus/static` | ETag, Range, path-traversal 보호, MIME 추론이 있는 정적 파일 서빙. |
| `nexus/limiter` | `nexus/limiter` | Rate limiting. 3가지 전략 (fixed / sliding / token-bucket) × 2가지 백엔드 (memory / drizzle). |
| `nexus/shield` | `nexus/shield` | 보안 스위트: CSRF (HMAC) + HSTS + CSP + X-Frame-Options + Referrer-Policy. |
| `nexus/cache` | `nexus/cache` | 애플리케이션 캐시. Memory (LRU + TTL) 및 Drizzle 백엔드. 실제 tag-based invalidation. |
| `nexus/drive` | `nexus/drive` | 파일 스토리지 추상화. Memory / Local / S3 / R2 드라이버. 서명된 URL. |
| `nexus/mail` | `nexus/mail` | 아웃바운드 이메일. Null / File / SMTP 전송. MJML 렌더링. |
| `nexus/drizzle` | `nexus/drizzle` | **기본 ORM.** Drizzle ORM 통합. 5개 dialect (postgres / mysql / sqlite / bun-sqlite / d1). Lucid 등가 API. |

### 추가 · 기존 모듈의 Drizzle 백엔드

`nexus/session`, `nexus/health`, `nexus/limiter`, `nexus/cache`가 모두 Drizzle
백엔드를 획득하여, 멀티 pod 배포에서 모든 Drizzle 호환 DB를 통해 상태 공유 가능.

| 모듈 | Drizzle 백엔드 |
| ------ | --------------- |
| `nexus/session` | `DrizzleSessionStorage` (`backend: 'database'`) |
| `nexus/health` | `DrizzleHealthIndicator` (`SELECT 1` probe) |
| `nexus/limiter` | `DrizzleRateLimitStorage` (3가지 전략 모두) |
| `nexus/cache` | `DrizzleCacheStore` (`invalidateByTag`용 tag 인덱스 포함) |

### 추가 · CLI

- `nx make:model` 및 `nx make:migration`이 이제 **dialect-aware**. `--dialect
  postgres | mysql | sqlite | bun-sqlite | d1`로 올바른 Drizzle import 경로와 컬럼 타입 선택.
- **신규 명령어 `nx migrate`** (`nx m`) — `drizzle-kit migrate`를 래핑, `--status`,
  `--generate "<name>"`, `--folder`, `--dialect`, `--config` 플래그.
- `nx init`이 `--orm drizzle` 선택 시 `drizzle.config.ts`를 자동 스캐폴드.
- `nx info`가 resolved `dialect` 필드 출력.

### 추가 · Lucid 격차 해소 (AdonisJS 비교)

`nexus/drizzle`은 가장 큰 AdonisJS 격차 (Lucid ORM)를 다음으로 해소:

- `DrizzleModel` 베이스 클래스 + `@Table` / `@Column` / `@PrimaryKey` 데코레이터.
- `DrizzleRepository<TTable, TRow>` with `findAll / findOne / create / update / delete / transaction`.
- `db.migrate(folder)`로 자동 마이그레이션, 부팅 시 `autoMigrate: true` 포함.
- `db.transaction(fn)`로 ACID 트랜잭션.
- `db.raw\`SELECT * FROM users WHERE id = ${id}\``로 **SQL injection 안전** raw 쿼리 — 값은 bound parameter로 전송, SQL 텍스트에 연결되지 않음.

### 추가 · SQL Injection 방지

`db.raw\`...\``는 tagged template literal. 모든 interpolate된`${value}`는 bound parameter가 됨 (postgres는 `$1, $2, ...`; sqlite / mysql은`?`). 드라이버가 SQL 텍스트와 파라미터 값 사이의 프로토콜-레벨 분리를 유지하므로,`"admin' OR 1=1 --"` 같은 악의적 입력은 SQL이 아닌 리터럴 문자열로 처리됨.

### 변경

- 패키지 버전 0.3.0으로 bump.
- `NxConfig`에 옵션 `dialect` 필드 추가.
- `MemoryStore` (cache)가 `invalidateByTag`용 `tag -> Set<key>` 인덱스 획득. MemoryStore의 `invalidateByTag()`는 더 이상 no-op이 아님.
- `CacheStore` 인터페이스에 옵션 `invalidateByTag()` 및 `gc()` 메서드 추가. 없는 기존 백엔드도 계속 작동.
- `SessionStorage.name`이 `'database'`를 유효 값으로 수용.

### 의존성

- **필수 peer dep**: `drizzle-orm` (`nexus/drizzle` 모듈 전체가 이것 없이 무의미).
- **옵션 peer dep** (해당 dialect 사용 시에만 설치): `pg`, `postgres`, `mysql2`, `better-sqlite3`.
- `nexus/logger`를 위해 `pino`와 `pino-pretty`가 dependencies에 추가됨.

### 문서

- 신규 `docs/user-guide/production-basics.md` — health, config, logger, static.
- 신규 `docs/user-guide/cross-cutting-features.md` — limiter, shield, cache, drive, mail.
- 신규 `docs/user-guide/drizzle.md` — Lucid 호환성 표가 포함된 종합 Drizzle 가이드.
- 신규 `docs/analysis/nestjs-comparison.md` 및 `docs/analysis/adonisjs-comparison.md` — 격차 분석.
- 모든 user guide에 한글 (`.ko.md`) 번역 추가.

### 검증 (v0.3)

- 322 / 322 tests pass (v0.3 이전부터 존재한 `tests/validation`, `tests/e2e`, `tests/config`의 실패 제외).
- `tsc --noEmit` clean.
- 17 bundle entry points; 34 runtime files emitted to `dist/`.

---

## [0.2.0] — 2026-05-15

Feature-complete MVP. 프레임워크가 "v0.2 약속" 모듈을 모두 획득.

### 추가

- **`nexus/auth`** — better-auth 통합. `AuthService`, `AuthController`, `authMiddleware`, `@CurrentUser()` 데코레이터.
- **`nexus/queue`** — BullMQ + Cloudflare Queues + memory 백엔드. `@OnQueueReady` 데코레이터, `QueueService.add/process`, retry 정책, `nx make:queue` 스캐폴드.
- **`nexus/schedule`** — In-tree cron parser (`croner` / `node-cron` 의존성 없음). `@Cron` / `@Interval` / `@Timeout` 데코레이터. `nx make:schedule` 스캐폴드.
- **`nexus/events`** — wildcards (`*` / `**`), 우선순위, 가드를 가진 `NexusEventEmitter`. `@OnEvent` 데코레이터.
- **`nexus/session`** — Cookie (HMAC) + memory 백엔드. Session 회전, sliding expiry, `nx make:session` 스캐폴드.
- **`nx` CLI** — 12개 명령어: `new`, `init`, `make:crud`, `make:controller`, `make:service`, `make:module`, `make:model`, `make:migration`, `make:middleware`, `make:validator`, `info`, `route:list`.

### 변경

- `@CurrentSession` → `@Session` (마이그레이션을 위해 현재 alias 유지).
- 패키지 버전 0.2.0으로 bump.

### 검증 (v0.2)

- 117 / 117 tests pass.
- 7 bundle entry points; clean typecheck.

---

## [0.1.0] — 2026-04-30

초기 릴리스. **feature-complete MVP core.**

### 추가

- **Core MVC**:
  - `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Options`, `@Head` HTTP method 데코레이터.
  - `@Req`, `@Res`, `@Next`, `@Body`, `@Query`, `@Param`, `@Headers`, `@Ctx`, `@User` 파라미터 데코레이터.
  - 3가지 라우팅 스타일: **Nest** (class 데코레이터), **Adonis** (router table), **Functional** (Hono-native).
- **DI 컨테이너** — `@Injectable`, `@Inject`, `Symbol.for("nexus:X")` 토큰, `useExisting`, `useFactory`, `useValue` providers, request-scoped lifecycle을 가진 class-based 주입.
- **검증 파이프라인** — `@Validate` 데코레이터로 Zod 스키마.
- **View engines**:
  - **Rendu** (Bun-native, 기본).
  - **Edge** (Adonis 스타일).
  - **Inertia.js adapter** — API 없이 전체 SPA UX. Asset 버전 관리, lazy-evaluation 헬퍼, merge props.
- **런타임**:
  - Bun (기본).
  - Node (≥ 18) Hono 통해 지원.
  - Cloudflare Workers (Hono adapter).
- **CLI 부트스트랩** — 미니멀 스캐폴드 도구.

### 검증 (v0.1)

- 24 / 24 tests pass.
- 단일 bundle entry point; clean typecheck.

---

[0.5.0]: https://github.com/kabyeon/nexusjs/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/kabyeon/nexusjs/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kabyeon/nexusjs/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kabyeon/nexusjs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kabyeon/nexusjs/releases/tag/v0.1.0
