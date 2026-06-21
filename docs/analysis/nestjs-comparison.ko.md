# NexusJS vs NestJS — 기능 격차 분석

> English version: [`nestjs-comparison.md`](./nestjs-comparison.md)
> 분석 일자: 2026-06-22 · 기준: NexusJS **v0.4.0**

이 문서는 NexusJS v0.4와 [NestJS](https://nestjs.com)를 비교하여
프로덕션급 백엔드 기능 중 **존재**, **부분 존재**, **누락** 상태를
식별한다. v0.3 마일스톤에서 모든 Tier 1 격차가 해소되었으므로 이
분석은 v0.4+ 로드맵 우선순위를 정하기 위한 Tier 2+ 잔존 격차에
집중한다.

> **중요**: NestJS는 7년된 프레임워크로 주당 ~1,000만 다운로드를
> 기록하며 수십 개의 공식 패키지를 보유한다. NexusJS는 어린 프레임워크
> (v0.3, 개발 기간 약 3개월)다. 기능 수를 직접 비교하는 것은
> 오해의 소지 — **프로덕션 사용을 차단하는 격차가 무엇인지**가 핵심
> 질문이다.

---

## 1. 요약 표 (v0.3)

범례: ✅ 출시됨 · ⚠️ 부분 지원 · ❌ 없음 · 🔵 써드파티 필요

| 카테고리 | NestJS | NexusJS v0.4 | 비고 |
|----------|--------|--------------|------|
| HTTP / 라우팅 | ✅ GraphQL, WebSockets, gRPC, SSE, Fastify | ⚠️ Hono 전용, GraphQL/WS/gRPC 없음 | REST + 함수형 + Nest/Adonis 스타일 |
| DI | ✅ 요청 스코프, 순환 자동 해소 | ⚠️ Singleton + transient + request | 이제 request 스코프 지원 (`nexus/drizzle`의 ALS) |
| Config | ✅ @nestjs/config, .env 검증 | ✅ `nexus/config` | Zod 검증, 레이어드 로딩 |
| 보안 | ✅ helmet, throttler, CSRF, CORS | ✅ `nexus/shield` (CSRF/HSTS/CSP) + `nexus/limiter` | CORS는 Hono 미들웨어 |
| 데이터베이스 | ✅ TypeORM, Prisma, Mongoose, Sequelize | ✅ `nexus/drizzle` (5개 dialect) | Drizzle가 기본 ORM |
| 캐시 | ✅ cache-manager (in-memory / Redis) | ✅ `nexus/cache` (memory / Drizzle) | 태그 기반 무효화, Redis는 커스텀 store |
| 로깅 | ✅ 내장 Logger (Winston / Pino 어댑터) | ✅ `nexus/logger` (Pino) | dev에서는 pretty, prod에서는 JSON, 요청 스코프는 ALS |
| 실시간 | ✅ WebSocket, SSE, gRPC 스트리밍 | ❌ 없음 | REST + cron + queue만 |
| 마이크로서비스 | ✅ TCP, Redis, NATS, Kafka, MQTT | ⚠️ `nexus/queue` (BullMQ / Cloudflare) | 잡 큐만, 서비스 메시 트랜스포트 없음 |
| API 문서 | ✅ @nestjs/swagger | ❌ OpenAPI 생성기 없음 | v0.4 예정 |
| 헬스 체크 | ✅ @nestjs/terminus | ✅ `nexus/health` | 내장 indicator (memory/disk/http/db) |
| 이메일 | ✅ @nestjs/mailer | ✅ `nexus/mail` (SMTP / File / Null) | MJML은 옵션 peer |
| 파일 업로드 | ✅ multer 통합 | ⚠️ Hono 네이티브, 헬퍼 없음 | Hono의 `c.req.parseBody()` 동작, 데코레이터 래퍼 없음 |
| 파일 스토리지 | ❌ DIY | ✅ `nexus/drive` (memory / Local / S3 / R2) | Nexus는 1급 `nexus/drive`, Nest는 없음 |
| i18n | ✅ nestjs-i18n | ❌ 없음 | v0.4 예정 |
| 피처 플래그 | ⚠️ DIY (공식 없음) | ⚠️ DIY | 둘 다 1급 없음 |
| 트레이싱 | ✅ OpenTelemetry 통합 | ❌ 없음 | v0.4 예정 |
| 메트릭 | ✅ Prometheus 통합 | ❌ 없음 | v0.4 예정 |
| 마이그레이션 | ⚠️ TypeORM / Prisma 내장 | ✅ `nexus/drizzle` + `nx migrate` | Drizzle 마이그레이터를 `nx migrate`로 래핑 |
| 인증 | ✅ @nestjs/passport + 다수 전략 | ✅ `nexus/auth` (better-auth) | better-auth가 다수 전략 지원 |

---

## 2. v0.3에서 해소된 항목 (최근 성과)

v0.3 마일스톤은 v0.2 분석에서 식별된 **모든 Tier 1 격차**를 해소했다.
이 섹션은 출시된 내용과 위치를 기록한다.

| v0.2에서 누락 | v0.3에서 출시 | 모듈 |
| -------------- | -------------- | ------ |
| 헬스 체크 (`@nestjs/terminus` 등가) | ✅ | `nexus/health` |
| Rate limiting / throttling | ✅ | `nexus/limiter` |
| 보안 헤더 (helmet 등가) | ✅ | `nexus/shield` (CSRF + HSTS + CSP) |
| 설정 관리 (`@nestjs/config` 등가) | ✅ | `nexus/config` |
| 로깅 (Pino / Winston 통합) | ✅ | `nexus/logger` |
| 캐시 (`cache-manager` 등가) | ✅ | `nexus/cache` |
| 이메일 통합 (`@nestjs/mailer` 등가) | ✅ | `nexus/mail` |
| 파일 스토리지 추상화 | ✅ | `nexus/drive` (memory / Local / S3 / R2) |
| 데이터베이스 통합 | ✅ | `nexus/drizzle` (기본 ORM) |
| 데이터베이스 마이그레이션 | ✅ | `nx migrate` + `nx migrate --generate` |
| 정적 파일 서빙 | ✅ | `nexus/static` |
| 기본 ORM (Drizzle 스타일) | ✅ | `nexus/drizzle` |

합계: v0.3 릴리스에서 **Tier 1+2 격차 12개 해소**.

---

## 3. Tier 1 — 잔존 필수 격차

이것들은 프레임워크가 아직 다루지 않는 **특정 프로덕션 사용 사례**를
차단한다.

### 3.1 OpenAPI / Swagger (`@nestjs/swagger` 등가)

- **왜 필수인가**: API 문서화, 클라이언트 SDK 생성, 계약 테스트는 모두
  OpenAPI 아티팩트에 의존한다. 이것 없이는 프론트엔드와 백엔드 팀이
  계약에서 서로 표류한다.
- **제안 모듈**: `nexus/openapi`
- **기능**:
  - `@ApiResponse()`, `@ApiProperty()`, `@ApiTags()` 데코레이터
  - `/docs` UI (Scalar 또는 Swagger UI)
  - Zod 스키마에서 자동 도출 (Zod → JSON Schema → OpenAPI)
  - `openapi-typescript`로 클라이언트 SDK 생성

### 3.2 파일 업로드 헬퍼 (`multer` 등가)

- **왜 필수인가**: 아바타, 첨부 파일, CSV 임포트, 프로필 사진.
  Hono 네이티브 API (`c.req.parseBody()`)는 동작하지만 타입 안전
  데코레이터 래퍼가 없다.
- **제안 모듈**: `nexus/upload`
- **기능**:
  - `@UploadedFile()` 데코레이터 (타입 안전)
  - `@UploadedFiles()` 다중 파일용
  - 파일 검증 (크기, MIME 타입)
  - 스토리지 어댑터: 로컬 디스크, S3, R2 (`nexus/drive` 경유)
  - 스트리밍 업로드 (디스크에 버퍼링하지 않음)

---

## 4. Tier 2 — 중요 (대부분 프로덕션 앱)

### 4.1 WebSockets (`@nestjs/websockets` 등가)

- **사용 사례**: 채팅, 알림, 라이브 대시보드, 멀티플레이어.
- **제안 모듈**: `nexus/ws`
- **기능**:
  - `@WebSocketGateway()` 데코레이터
  - 핸들러용 `@SubscribeMessage()`
  - 룸 관리
  - `ws` (Node) 또는 Workers WebSocket 페어 기반
- **비고**: Hono에 실험적 WebSocket 지원이 있다 — 재구현 대신 래핑한다.

### 4.2 Server-Sent Events (SSE)

- **사용 사례**: 단방향 스트리밍 (AI 채팅 응답, 빌드 진행률, 라이브 로그).
- **제안 모듈**: `nexus/sse` (얇은 래퍼)
- **기능**:
  - 핸들러의 `SseStream` 반환 타입
  - Hono의 `c.stream()` 기반
  - `Last-Event-ID`로 재연결

### 4.3 코어 기능으로서의 요청 스코프 DI

- **왜**: 멀티 테넌트 앱, 요청별 컨텍스트(테넌트, 로케일, 요청 ID),
  감사 로깅은 모두 요청 스코프가 필요하다.
- **현황**: `nexus/drizzle`이 이미 트랜잭션 핸들에 AsyncLocalStorage를
  사용한다. 코어 레벨 `RequestScope`(또는 `scope: 'request'` 제공자
  옵션)는 계획 중이다.
- **제안 기능**: `nexus/core` 확장
- **기능**:
  - `{ scope: 'request' }` 제공자 옵션
  - AsyncLocalStorage 기반 전파
  - HTTP, queue 핸들러, cron 컨텍스트에서 동작

### 4.4 gRPC (`@nestjs/microservices` 부분)

- **사용 사례**: 서비스 간 고성능 RPC.
- **제안 모듈**: `nexus/grpc`
- **기능**:
  - `@GrpcMethod('UserService', 'findById')` 데코레이터
  - 스트리밍 (서버, 클라이언트, 양방향)
  - Reflect 기반 스키마

### 4.5 GraphQL (`@nestjs/graphql` 등가)

- **사용 사례**: BFF 패턴, 모바일 클라이언트, 스키마 우선 개발.
- **제안 모듈**: `nexus/graphql`
- **기능**:
  - `@Resolver()`, `@Query()`, `@Mutation()` 데코레이터
  - 코드 우선 스키마 생성
  - DataLoader 통합 (N+1 방지)
  - Federation 지원
- **비고**: 다른 것들보다 우선순위 낮음 — 대부분의 팀은 여전히 REST를 출시한다.

---

## 5. Tier 3 — Nice-to-have

### 5.1 i18n (`nestjs-i18n` 등가)

- **사용 사례**: 다국어 SaaS.
- **제안 모듈**: `nexus/i18n`
- **기능**:
  - `t('users.welcome', { name })` API
  - 요청별 로케일 해석
  - JSON / YAML / gettext 호환 메시지 카탈로그

### 5.2 피처 플래그

- **사용 사례**: 카나리 배포, A/B 테스트, 점진적 롤아웃.
- **제안 모듈**: `nexus/feature-flag`
- **기능**:
  - `@FeatureFlag('new-dashboard')` 데코레이터
  - 백엔드: in-memory / LaunchDarkly / Unleash
  - 테넌트별 / 사용자별 타겟팅

### 5.3 트레이싱 (`@nestjs/event-emitter` 인접)

- **사용 사례**: 분산 시스템 디버깅.
- **제안 모듈**: `nexus/tracing`
- **기능**:
  - OpenTelemetry 익스포터
  - `@Trace('user.create')` 데코레이터
  - queue / HTTP 경계를 넘는 트레이스 컨텍스트 전파
  - OTLP 익스포터 (Jaeger / Tempo / Honeycomb)

### 5.4 메트릭 (Prometheus)

- **사용 사례**: SLO 모니터링, 알림.
- **제안 모듈**: `nexus/metrics`
- **기능**:
  - `@Counter('http_requests_total')` / `@Histogram` / `@Gauge`
  - `/metrics` Prometheus 형식 엔드포인트
  - 기본 요청 / queue / 이벤트 메트릭

### 5.5 Resilience: 회로차단기 + 재시도

- **사용 사례**: 외부 API 복원력.
- **제안 모듈**: `nexus/resilience`
- **기능**:
  - `@Retry({ attempts: 3, backoff: 'exponential' })` 데코레이터
  - `@CircuitBreaker({ threshold: 0.5 })` 데코레이터
  - 벌크헤드 격리

### 5.6 프로젝트당 멀티 데이터베이스

- **사용 사례**: 한 프로젝트에서 PostgreSQL + Elasticsearch.
- **제안**: `nexus/drizzle` 확장 (아키텍처는 이미 지원 —
  `DrizzleModule.forRoot({...})`를 다른 토큰으로 여러 번 호출 가능).

---

## 6. 빠른 성과 (작은 노력, 큰 임팩트)

| 작업 | 노력 | 임팩트 | 비고 |
|------|------|--------|------|
| Zod 기반 OpenAPI 생성기 | 낮음 | 높음 | 클라이언트 팀에 큰 DX 개선 |
| CORS 추상화 | 낮음 | 중간 | Hono의 `cors()` 동작, 얇은 래퍼로 일관된 설정 |
| 멀티 런타임 패리티 테스트 | 낮음 | 높음 | 모든 모듈에서 Bun / Node / Workers |
| `nexus/cache` Redis store (기존 패턴) | 낮음 | 높음 | 같은 `CacheStore` 인터페이스, 백엔드 하나 더 |
| `@UploadedFile()` 데코레이터 | 낮음 | 중간 | 얇은 Hono 래퍼 |
| Multipart body parser 래퍼 | 낮음 | 중간 | 위와 동일 |
| `helmet()` 미들웨어 | 매우 낮음 | 높음 | `nexus/shield`에 즉시 출시 가능 |

가장 큰 **단일** 잔여 레버는 **OpenAPI** — 새 프로젝트 첫 주에
"API가 무엇을 기대하는지" 왕복을 제거하여 그 자체로 비용을
회수한다.

---

## 7. 권장 v0.4+ 로드맵

### v0.4 — API 완성도 (the "SDK-friendly" 마일스톤)

1. **`nexus/openapi`** — Zod → OpenAPI, Scalar UI
2. **`nexus/upload`** — 파일 업로드 헬퍼
3. **`nexus/sse`** — Server-Sent Events
4. **요청 스코프 DI** — 코어 확장
5. **`nexus/tracing`** — OpenTelemetry
6. **`nexus/metrics`** — Prometheus

이 6개는 NexusJS를 **API 명시적** + **관측 가능**하게 만들며, 이는
현대 백엔드 서비스의 표준이다.

### v0.5 — 실시간 & 분산

- `nexus/ws` — WebSockets
- `nexus/graphql` — GraphQL
- `nexus/microservice` — TCP / NATS / Redis 트랜스포트
- `nexus/grpc` — gRPC 서버 / 클라이언트

### v0.6 — 강화

- `nexus/resilience` — 회로차단기, 재시도, 벌크헤드
- `nexus/i18n` — i18n
- `nexus/feature-flag` — 피처 플래그
- 멀티 데이터베이스, 하이브리드 앱, 안정적인 공개 API 표면

---

## 8. 정직한 평가 (v0.4)

NexusJS v0.3은 **대부분의 CRUD 백엔드에 프로덕션 준비됨**:

- MVC + DI + 검증 코어는 견고하고 실전 테스트되었다.
- 17개 옵션 모듈 (auth, queue, schedule, events, session, health,
  config, logger, static, limiter, shield, cache, drive, mail,
  drizzle, cli)은 각각 독립적으로 사용 가능하고 잘 분리되어 있다.
- 기본 ORM으로서의 Drizzle은 AdonisJS-Lucid 격차를 해소하며 Bun-native
  앱에 **가장 강력한** ORM 선택이라고 할 수 있다.
- CLI는 새 프로젝트에서 NestJS의 `nest g`보다 명백히 낫다.
- SQL 인젝션 방지 raw-query primitive는 최고 수준이다.

"NestJS 피처 패리티"에 부족한 것은 대부분 **특수 인프라**
(WebSockets, GraphQL, 마이크로서비스, OpenTelemetry)로, 많은
팀이 프로젝트 첫 6개월 동안 필요로 하지 않는다.

v0.3에서 v1.0까지의 경로는 대략:

- **v0.4** (2026년 3분기): API 관측 가능성 — OpenAPI, SSE, upload,
  tracing, metrics.
- **v0.5** (2026년 4분기): 실시간 — WebSockets, GraphQL, gRPC,
  마이크로서비스.
- **v0.6** (2027년 1분기): 프로덕션 강화 — resilience, i18n,
  피처 플래그, 안정적인 공개 API 표면.

v0.6 이후 NexusJS는 Bun의 런타임 + ORM 이점을 가진, **NestJS가
오늘 지원하는 모든 백엔드의** 실행 가능한 대안이 된다.

---

## 9. 참고

- [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.4 릴리스 노트
- [`../README.md`](../../README.md) — 현재 상태 & 로드맵
- [`../../user-guide/`](../../user-guide/) — 17개 모듈 가이드
- [`../../design/`](../../design/) — 아키텍처 심층 문서
- [`./adonisjs-comparison.md`](./adonisjs-comparison.md) — 동반 분석
- [NestJS 문서](https://docs.nestjs.com) — 비교 기준
- [Bulletproof Node.js architecture](https://github.com/santiq/bulletproof-nodejs) —
  이 분석이 도출된 프로덕션 체크리스트
