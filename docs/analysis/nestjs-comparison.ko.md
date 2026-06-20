# NexusJS vs NestJS — 기능 갭 분석

> English version: [`nestjs-comparison.md`](./nestjs-comparison.md)
> 분석 일자: 2026-06-20 · 기준: NexusJS v0.2.0

이 문서는 NexusJS v0.2와 [NestJS](https://nestjs.com)를 비교하여
production-grade 백엔드 기능 중 **있음 / 부분적 / 없음** 상태를 식별합니다.
v0.3+ 로드맵 우선순위를 정직하게 책정하기 위한 것이 목표입니다.

> **중요**: NestJS는 7년된 프레임워크(주간 다운로드 ~10M)에 수십 개의
> first-party 패키지를 가지고 있다. NexusJS는 어린 프레임워크
> (v0.2, ~6주 개발)다. 기능 수를 비교하는 것은 오해의 소지가 있다 —
> 진짜 질문은 **어떤 갭이 production 사용을 막는가**이다.

---

## 1. 요약 표

| 카테고리 | NestJS | NexusJS v0.2 | 비고 |
|----------|--------|--------------|-------|
| HTTP / 라우팅 | ✅ GraphQL, WebSockets, gRPC, SSE, Fastify | ❌ Hono만 | REST만 |
| DI | ✅ Request-scoped, circular auto-resolve | ⚠️ Singleton만 | - |
| Config | ✅ @nestjs/config, .env 검증 | ❌ 직접 `process.env` | - |
| Security | ✅ helmet, throttler, CSRF, CORS | ❌ Hono 미들웨어 위임 | - |
| Database | ✅ TypeORM, Prisma, Mongoose, Sequelize | ⚠️ Drizzle 옵션만 | 통합 패키지 없음 |
| Cache | ✅ cache-manager (in-memory / Redis) | ❌ 없음 | - |
| Logging | ✅ 내장 Logger (Winston / Pino 어댑터) | ❌ `console.log`만 | - |
| Realtime | ✅ WebSocket, SSE, gRPC streaming | ❌ 없음 | - |
| Microservices | ✅ TCP, Redis, NATS, Kafka, MQTT | ❌ 없음 | - |
| API 문서 | ✅ @nestjs/swagger | ❌ OpenAPI 생성기 없음 | - |
| Health checks | ✅ @nestjs/terminus | ❌ 없음 | - |
| Email | ✅ @nestjs/mailer | ❌ 없음 | - |
| File upload | ✅ multer 통합 | ❌ 없음 | - |
| i18n | ✅ nestjs-i18n | ❌ 없음 | - |
| Feature flags | ⚠️ 직접 구현 (first-party 없음) | ❌ 없음 | NestJS도 기본 없음 |
| Tracing | ✅ OpenTelemetry 통합 | ❌ 없음 | - |
| Metrics | ✅ Prometheus 통합 | ❌ 없음 | - |

---

## 2. Tier 1 — 프로덕션 필수

가장 **먼저** 추가해야 할 기능들. 대부분의 production 백엔드가 필요로 하며, 이것이 없으면 K8s 배포가 불가능하거나 API가 남용에 노출되거나 운영이 불가능해진다.

### 2.1 Health checks (`@nestjs/terminus` 동급)

- **왜 필수**: Kubernetes / Docker / 로드밸런서가 readiness probe와 rolling deploy에 `/health/live`와 `/health/ready` 엔드포인트를 사용한다. 이게 없으면 K8s가 unhealthy pod를 auto-restart할 수 없고, AWS ALB가 healthy 인스턴스와 degraded 인스턴스를 구분할 수 없다.
- **제안 모듈**: `nexus/health`
- **기능**:
  - `LivenessCheck`, `ReadinessCheck`, `StartupCheck` 인터페이스
  - 내장 indicator: DB ping, Redis ping, 메모리, 디스크
  - `HealthCheckService.check([...])` aggregator
- **사용 예**:

  ```ts
  @Get('/health/ready')
  async ready() {
    return this.health.check([
      this.db.pingCheck('database'),
      this.redis.pingCheck('cache'),
    ]);
  }
  ```

### 2.2 Rate limiting / throttling (`@nestjs/throttler` 동급)

- **왜 필수**: 이것 없이는 로그인 엔드포인트, 비밀번호 재설정 흐름, 결제 API, 가입 폼이 credential stuffing 및 brute-force 공격에 완전히 노출된다.
- **제안 모듈**: `nexus/throttle`
- **기능**:
  - `@Throttle({ default: { limit: 10, ttl: 60_000 } })` 데코레이터
  - 라우트별 / 컨트롤러별 / 글로벌 제한
  - IP 기반, 사용자 기반, API 키 기반 키
  - Sliding-window 알고리즘 (memory 또는 Redis)

### 2.3 Security headers (`@nestjs/helmet` 동급)

- **왜 필수**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options 없이는 모든 응답이 기본적으로 XSS, clickjacking, MIME-sniffing 공격에 취약하다.
- **제안 모듈**: `nexus/core`에 middleware로 포함
- **기능**:
  - `app.use('*', helmet())` 한 줄
  - 합리적 기본값 (HSTS, X-Frame-Options=DENY 등)
  - 느슨한 CSP가 필요한 API용 라우트별 override

### 2.4 Configuration management (`@nestjs/config` 동급)

- **왜 필수**: 이것 없이는 `process.env.X`가 코드베이스 전체에 흩어지고, 오타가 런타임에서만 나타난다. Production 배포가 silently 실패한다.
- **제안 모듈**: `nexus/config`
- **기능**:
  - `ConfigModule.forRoot({ schema: z.object({ DATABASE_URL: z.string().url() }) })`
  - JITI 스타일 동적 로딩 (`.env`, `.env.local` 등)
  - 멀티 환경 지원 (dev / prod / test)
  - 타입 안전한 `config.get('DATABASE_URL')`

### 2.5 OpenAPI / Swagger (`@nestjs/swagger` 동급)

- **왜 필수**: API 문서화, 클라이언트 SDK 생성, contract 테스트가 모두 OpenAPI artifact에 의존한다. 이게 없으면 frontend와 backend 팀이 contract에서 어긋난다.
- **제안 모듈**: `nexus/openapi`
- **기능**:
  - `@ApiResponse()`, `@ApiProperty()`, `@ApiTags()` 데코레이터
  - `/docs` UI (Scalar 또는 Swagger UI)
  - Zod 스키마에서 자동 유도
  - `openapi-typescript`로 클라이언트 SDK 생성

### 2.6 Request-scoped DI

- **왜 필수**: 멀티테넌트 앱, 요청별 컨텍스트(tenant, locale), 감사 로깅 모두 요청별 scope가 필요하다. 이것 없이는 global state (race condition) 또는 요청마다 컨테이너 재생성(느림)으로 fallback한다.
- **제안 모듈**: `nexus/core` 확장
- **기능**:
  - `{ scope: 'request' }` provider 옵션
  - AsyncLocalStorage 기반 전파
  - HTTP, WebSocket, Cron 컨텍스트에서 동작

### 2.7 GraphQL (`@nestjs/graphql` 동급)

- **왜 필수**: 많은 백엔드 팀이 BFF 패턴, 모바일 클라이언트, schema-first 개발을 위해 GraphQL을 선호한다.
- **제안 모듈**: `nexus/graphql`
- **기능**:
  - `@Resolver()`, `@Query()`, `@Mutation()` 데코레이터
  - Code-first 스키마 생성
  - DataLoader 통합 (N+1 방지)
  - Federation 지원
- **참고**: 다른 항목보다 우선순위 낮음 — 대부분의 팀이 여전히 REST로 배포.

---

## 3. Tier 2 — 중요 (대부분의 production 앱)

### 3.1 WebSockets (`@nestjs/websockets` 동급)

- **용도**: 채팅, 알림, 라이브 대시보드, 멀티플레이어
- **제안 모듈**: `nexus/ws`
- **기능**:
  - `@WebSocketGateway()` 데코레이터
  - 핸들러용 `@SubscribeMessage()`
  - Room 관리
  - `ws`(Node) 또는 Workers WebSocket pair 기반

### 3.2 Caching (`@nestjs/cache-manager` 동급)

- **용도**: DB 쿼리 캐싱, API 응답 캐싱, 세션 저장소
- **제안 모듈**: `nexus/cache`
- **기능**:
  - `@CacheKey()`, `@CacheTTL()`, `@CacheInterceptor()` 데코레이터
  - In-memory 어댑터 (LRU)
  - Redis 어댑터 (multi-instance)
  - 태그 기반 무효화

### 3.3 Server-Sent Events (SSE)

- **용도**: 단방향 streaming (AI 채팅 응답, 빌드 진행, 라이브 로그)
- **제안 모듈**: `nexus/sse` (작은 wrapper)
- **기능**:
  - 핸들러에서 `SseStream` 반환 타입
  - Hono의 `c.stream()` 기반
  - `Last-Event-ID`로 재연결

### 3.4 Microservices (`@nestjs/microservices` 동급)

- **용도**: 분산 시스템, 서비스 간 통신
- **제안 모듈**: `nexus/microservice`
- **기능**:
  - TCP, Redis, NATS, Kafka transport
  - `@MessagePattern('user.created')` 데코레이터
  - Hybrid app: 같은 프로세스에서 HTTP + microservice
  - Request-response 및 event 패턴

### 3.5 Email 통합 (`@nestjs/mailer` 동급)

- **용도**: 가입 확인, 비밀번호 재설정, 트랜잭션 메일
- **제안 모듈**: `nexus/mailer`
- **기능**:
  - `@InjectMailer()` 데코레이터
  - 템플릿 엔진 (Rendu / Edge)
  - 어댑터: nodemailer (SMTP), Resend, AWS SES, Postmark

### 3.6 File upload (`multer` 통합)

- **용도**: 아바타, 첨부파일, 이미지 업로드, CSV 임포트
- **제안 모듈**: `nexus/upload`
- **기능**:
  - `@UploadedFile()` 데코레이터 (타입화)
  - 파일 검증 (크기, MIME 타입)
  - 스토리지 어댑터: 로컬 디스크, S3, Cloudflare R2
  - Streaming 업로드 (디스크에 버퍼링 안 함)

### 3.7 Logging 추상화

- **용도**: 구조화된 로그, 로그 레벨, 요청 컨텍스트
- **제안 모듈**: `nexus/logger`
- **기능**:
  - 레벨 (debug / info / warn / error / fatal) `Logger` 클래스
  - Pino / Winston 어댑터
  - 요청 스코프 컨텍스트 (requestId, userId, tenantId)
  - dev에서 pretty-print, prod에서 JSON

### 3.8 Database migration 도구

- **용도**: prod의 스키마 변경, 롤백, 감사 추적
- **제안 모듈**: `nx migrate:generate`, `nx migrate:apply` CLI
- **기능**:
  - 스키마 diff에서 생성 (Drizzle Kit 통합)
  - Up / down 마이그레이션
  - Dry-run 모드
  - CI 통합 (배포 전 실행)

### 3.9 CORS 추상화

- **용도**: SPA ↔ API cross-origin
- **제안 모듈**: `nexus/core`의 미들웨어
- **기능**:
  - `app.use('*', cors({ origin: ['http://localhost:3001'], credentials: true }))`
  - 라우트별 CORS override
  - `nx.config.ts`에서 자동 구성

---

## 4. Tier 3 — Nice-to-have

### 4.1 i18n (`nestjs-i18n` 동급)

- **용도**: 다국어 SaaS
- **제안 모듈**: `nexus/i18n`

### 4.2 Feature flags

- **용도**: 카나리 배포, A/B 테스트, 점진적 롤아웃
- **제안 모듈**: `nexus/feature-flag`

### 4.3 OpenTelemetry / tracing

- **용도**: 분산 시스템 디버깅
- **제안 모듈**: `nexus/tracing`

### 4.4 Metrics (Prometheus)

- **용도**: SLO 모니터링, 알림
- **제안 모듈**: `nexus/metrics`

### 4.5 gRPC (`@nestjs/microservices`의 일부)

- **용도**: 서비스 간 고성능 RPC
- **제안 모듈**: `nexus/grpc`

### 4.6 Circuit breakers / retry

- **용도**: 외부 API 회복 탄력성
- **제안 모듈**: `nexus/resilience`

### 4.7 Multi-database

- **용도**: 한 프로젝트에 PostgreSQL + Elasticsearch
- **제안 모듈**: `nexus/db` 확장

---

## 5. Quick wins (작은 노력, 큰 임팩트)

다음은 각각 **1일 이내**에 추가 가능하면서 효과가 큰 항목들이다.

| 작업 | 노력 | 임팩트 |
|------|------|--------|
| `helmet()` 미들웨어 | 매우 낮음 (1-2시간) | 높음 |
| Zod → OpenAPI 생성기 | 낮음 | 높음 |
| Zod 검증이 포함된 `ConfigService` | 중간 | 높음 |
| CORS 추상화 | 낮음 | 중간 |
| DB 헬스 체크 | 낮음 | 높음 (K8s 배포) |
| Rate-limit 데코레이터 | 중간 | 높음 |
| Pino 로거 통합 | 중간 | 높음 (production) |

`helmet()` + Zod → OpenAPI 생성기가 **지금 바로 가능한 가장 효과
좋은 quick win 두 가지**다.

---

## 6. 권장 v0.3+ 로드맵

### v0.3 — Production basics (the "deploy-ready" 마일스톤)

1. **`nexus/health`** — K8s / 모니터링 전제 조건
2. **`nexus/config`** — env 검증, 보안
3. **`nexus/throttle`** — API 보호
4. **helmet + CORS 미들웨어** — 보안 베이스라인
5. **`nexus/logger`** — Pino / Winston 통합
6. **DB 마이그레이션 도구** — Drizzle Kit 통합

이 6개가 합쳐지면 NexusJS는 대부분의 CRUD 백엔드에 대해
"production deploy-ready" 상태가 된다.

### v0.4 — Real-time & API

7. `nexus/cache` — in-memory + Redis
2. `nexus/ws` — WebSockets
3. `nexus/sse` — SSE
4. `nexus/openapi` — Swagger UI
5. `nexus/upload` — 파일 업로드
6. `nexus/mailer` — 이메일
7. Request-scoped DI

### v0.5 — Distributed

14. `nexus/microservice` — TCP/Redis/NATS
2. `nexus/graphql` — GraphQL
3. `nexus/i18n` — i18n
4. `nexus/tracing` — OpenTelemetry
5. `nexus/metrics` — Prometheus

### v0.6 — Hardening

19. `nexus/resilience` — circuit breakers, retry
2. `nexus/feature-flag`
3. Hybrid app (HTTP + microservice)
4. Multi-database

---

## 7. 정직한 평가

NexusJS v0.2는 **견고한 기반**을 가지고 있다.

- MVC + DI + validation 코어는 production-ready다.
- 옵션 모듈(auth, queue, schedule, events, session) 각각 잘 범위가 정해져 있고 적절히 분리되어 있다.
- CLI는 신규 프로젝트에서 NestJS의 `nest g`보다 진정으로 더 낫다.

빠진 것은 **지루한 production scaffolding** — NestJS가 7년에 걸쳐 축적한 20개 모듈로, 모두가 production 단계에 도달할 때까지 잊어버리는 것들이다.

좋은 소식: 대부분 **additive**다. 새로운 `nexus/health` 패키지는 코어를 건드리지 않고 출시할 수 있다. 기반이 한 번에 하나씩 추가하는 것을 지원한다.

"NestJS 기능 동등성"에 이르는 현실적 경로는 **~12-18개월의 꾸준한 작업**이며, **v0.3 production-basics가 가장 시급한** 마일스톤이다. v0.3 이후 NexusJS는 대부분의 CRUD 백엔드에 대한 viable 대안이 되며, 나머지 갭은 대부분 **특수 인프라**(GraphQL, microservices, gRPC)로 많은 팀이 필요로 하지 않는다.

---

## 8. 참고

- [`../README.md`](../../README.md) — 현재 상태 & 로드맵
- [`../user-guide/`](../../user-guide/) — 기존 모듈 가이드
- [`../design/`](../../design/) — 기존 설계 문서 (auth, queue 등)
- [NestJS 문서](https://docs.nestjs.com) — 비교 기준
- [Bulletproof Node.js architecture](https://github.com/santiq/bulletproof-nodejs) —
  이 분석이 파생된 production 체크리스트
