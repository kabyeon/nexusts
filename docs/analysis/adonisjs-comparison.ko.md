# NexusJS vs AdonisJS — 기능 갭 분석

> English version: [`adonisjs-comparison.md`](./adonisjs-comparison.md)
> 분석 일자: 2026-06-20 · 기준: NexusJS v0.2.0

이 문서는 NexusJS v0.2와 [AdonisJS v6](https://adonisjs.com)를 비교하여
백엔드 핵심 기능 중 **있음 / 부분적 / 없음** 상태를 식별합니다. 동거
분석 [`nestjs-comparison.md`](./nestjs-comparison.md)와 동일한 구조로
작성되었으며, **두 프레임워크가 갈라지는 지점**을 강조합니다.

> **중요**: AdonisJS와 NestJS는 겹치지만 다른 문제를 해결한다. NestJS는
> "HTTP도 할 수 있는 DI 프레임워크"에 가깝고, AdonisJS는 "자체 ORM,
> 템플릿 엔진, CLI를 갖춘 full-stack batteries-included 백엔드"에
> 가깝다. 기능 단위 비교는 **batteries**에서는 AdonisJS가,
> **아키텍처 유연성**에서는 NestJS가 유리하다.

---

## 1. 요약 표

| 카테고리 | AdonisJS | NexusJS v0.2 | 비고 |
|----------|----------|--------------|-------|
| HTTP / 라우팅 | ✅ Resource routes, groups, middleware | ✅ 3가지 스타일 | 동등 |
| **ORM** | ✅ **Lucid** (first-party, batteries-included) | ⚠️ Drizzle 옵션 | **큰 갭** |
| **Validator** | ✅ **VineJS** (first-party, 매우 빠름) | ⚠️ Zod만 | 기능상 동등; Vine 선호 시 갭 |
| **Auth** | ✅ **Multi-guard** (session / access_tokens / basic_auth) | ⚠️ better-auth (단일 시스템) | 갭 |
| **Mail** | ✅ **@adonisjs/mail** (MJML 통합) | ❌ 없음 | **큰 갭** |
| **Drive (스토리지)** | ✅ **@adonisjs/drive** (S3 / GCS / 로컬) | ❌ 없음 | **큰 갭** |
| **Shield** (CSRF / XSS) | ✅ 내장 | ❌ 없음 | 갭 |
| **Static** | ✅ `serveStatic` 미들웨어 | ❌ 없음 (Hono 미들웨어 사용) | 작은 갭 |
| **Encryption / Hash** | ✅ `@adonisjs/encryption`, `@adonisjs/hash` | ❌ 없음 | 갭 |
| **Bodyparser** | ✅ Multipart, file upload, streams | ❌ 없음 | 갭 |
| Health checks | ✅ `@adonisjs/health` | ❌ 없음 | 갭 |
| Cache | ✅ `@adonisjs/cache` (in-memory / Redis) | ❌ 없음 | 갭 |
| Logging | ✅ Pino 통합 | ❌ `console.log`만 | 갭 |
| CORS | ✅ `@adonisjs/cors` | ❌ Hono 미들웨어 위임 | 동등 (Hono가 있음) |
| Session | ✅ `@adonisjs/session` (cookie / memory / Redis) | ✅ Cookie / memory | 동등 |
| Queue | ✅ `@adonisjs/queue` (BullMQ 기반) | ✅ BullMQ / Cloudflare / Memory | 동등 |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `@Cron` / `@Interval` / `@Timeout` | 동등 |
| Events | ✅ `@adonisjs/events` | ✅ `@OnEvent` 와일드카드 | 동등 |
| i18n | ✅ `@adonisjs/i18n` | ❌ 없음 | 갭 |
| WebSocket | ✅ `@adonisjs/websocket` | ❌ 없음 | 갭 |
| Realtime (SSE) | ⚠️ DIY | ❌ 없음 | 동등 (둘 다 DIY) |
| Microservices | ⚠️ DIY | ❌ 없음 | 동등 (둘 다 DIY) |
| CLI / Scaffolding | ✅ **Ace** (성숙, VSCode 통합) | ✅ **nx** (최신, 비슷한 표면) | 동등 |
| Test framework | ✅ **Japa** (first-party) | ⚠️ Vitest (외부) | 동등 (Vitest 우수) |
| DI | ✅ IoC 컨테이너, 데코레이터 | ✅ 데코레이터 기반 | 동등 |

**핵심 갭**: AdonisJS는 NexusJS보다 **훨씬 더 많은 first-party
batteries-included 패키지**를 가지고 있다. 대부분 작고 잘 범위가
정해진 모듈로, NexusJS가 점진적으로 추가할 수 있다.

---

## 2. Tier 1 — 프로덕션 필수

가장 **먼저** 추가해야 할 기능들. 각 항목은 NestJS/AdonisJS 사용자가
당연하다고 여기는 일반적인 프로덕션 요구사항을 다룬다.

### 2.1 Health checks (`@adonisjs/health` 동급)

- **왜 필수**: NestJS 분석과 동일 — K8s readiness probe, 로드밸런서 헬스 체크, 운영 대시보드.
- **제안 모듈**: `nexus/health` (NestJS 분석과 동일 모듈 — 같은 갭)

### 2.2 Cache (`@adonisjs/cache` 동급)

- **왜 필수**: 모든 CRUD 백엔드는 비싼 쿼리나 응답을 캐싱하는 것이 좋다. 이게 없으면 모든 DB 호출이 끝까지 도달한다.
- **제안 모듈**: `nexus/cache`
- **기능**:
  - `@CacheKey()`, `@CacheTTL()`, `@CacheInterceptor()` 데코레이터
  - In-memory 어댑터 (LRU)
  - Redis 어댑터 (multi-instance)
  - 태그 기반 무효화
- **사용 예**:

  ```ts
  @CacheTTL(60_000)
  @Get('/users/:id')
  async show(@Param('id') id: string) {
    return this.users.find(id);
  }
  ```

### 2.3 Configuration management (`@adonisjs/config` 동급)

- **왜 필수**: `process.env.X`가 코드베이스 전체에 흩어지면 production에서 silently 실패한다. AdonisJS의 `@adonisjs/config`는 TypeScript 파일을 dotenv처럼 로드; 우리는 Zod로 검증할 수 있다.
- **제안 모듈**: `nexus/config` (NestJS 분석에서도 flag됨)

### 2.4 Rate limiting / throttling

- **왜 필수**: NestJS 분석과 동일 — API 남용으로부터 보호.
- **제안 모듈**: `nexus/throttle`

### 2.5 Logging (Pino 통합)

- **왜 필수**: `console.log`는 production에서 사용 불가. AdonisJS는 Pino를 기본으로 통합; 우리도 그래야 한다.
- **제안 모듈**: `nexus/logger`
- **기능**:
  - 레벨 (debug / info / warn / error / fatal) `Logger` 클래스
  - Pino 어댑터 (production 기본값)
  - Pretty-print 어댑터 (development)
  - 요청 스코프 컨텍스트 (requestId, userId)
- **사용 예**:

  ```ts
  constructor(@Inject(Logger.TOKEN) private logger: Logger) {}

  @Get('/users/:id')
  async show(@Param('id') id: string) {
    this.logger.info({ userId: id }, 'fetching user');
  }
  ```

### 2.6 CORS 추상화

- **왜 필수**: SPA ↔ API cross-origin. AdonisJS는 `@adonisjs/cors`를 제공; 우리는 Hono 미들웨어에 위임 (동작은 하지만 first-party 설정 없음).
- **제안 모듈**: `nexus/core`의 미들웨어
- **기능**:
  - `app.use('*', cors({ origin: [...], credentials: true }))`
  - `nx.config.ts`에서 자동 구성
  - 라우트별 override

---

## 3. Tier 2 — 중요 (AdonisJS 강점 영역)

이들은 **AdonisJS가 특히 강한** 영역 — "batteries-included" 프레임워크로 만드는 기능들. NexusJS v0.2는 여기서 더 약한 이야기를 가지고 있다.

### 3.1 Drive — 스토리지 추상화 (`@adonisjs/drive` 동급)

- **왜 중요**: 사용자 업로드 파일(아바타, 첨부파일, CSV 임포트)은 로컬 디스크, S3, GCS, R2에 걸친 균일 API가 필요하다. 이것 없이는 모든 컨트롤러가 AWS SDK를 직접 호출한다.
- **제안 모듈**: `nexus/drive`
- **기능**:
  - `DriveService.put(path, content)`, `.get(path)`, `.delete(path)`
  - 스토리지 어댑터: `local`, `s3`, `gcs`, `r2`
  - Presigned URL 생성
  - 스트리밍 업로드/다운로드
- **사용 예**:

  ```ts
  @Post('/avatar')
  async upload(@UploadedFile('avatar') file: File) {
    await this.drive.put(`avatars/${userId}.png`, file.stream());
  }
  ```

### 3.2 Mail (`@adonisjs/mail` 동급)

- **왜 중요**: 가입 확인, 비밀번호 재설정, 트랜잭션 메일, 마케팅 이메일 — 모든 SaaS에 필요.
- **제안 모듈**: `nexus/mail`
- **기능**:
  - `@InjectMailer()` 데코레이터
  - 템플릿 엔진 통합 (Edge / Rendu)
  - MJML 지원 (table-layout 없이 반응형 HTML 이메일)
  - 어댑터: nodemailer (SMTP), Resend, AWS SES, Postmark
- **사용 예**:

  ```ts
  await this.mail.send('welcome', { to: user.email, data: { name } });
  ```

### 3.3 Shield — CSRF / XSS (`@adonisjs/shield` equivalent)

- **왜 중요**: 보안 기본값은 옵트인이 아니라 기본으로 활성화되어야 한다. AdonisJS는 `shield`를 제공하여:
  - 크로스 오리진 form post 차단 (CSRF)
  - 보안 헤더 설정 (CSP, X-Frame-Options, X-Content-Type-Options)
  - `dangerouslySetInnerHTML` 스타일 XSS 벡터 비활성화
- **제안 모듈**: `nexus/shield`
- **기능**:
  - `app.use('*', shield())` 미들웨어
  - CSRF 토큰 생성 + 검증
  - 보안 기본값 + override 노브
  - 순수 JSON API용 라우트별 opt-out

### 3.4 Static file 서빙 (`@adonisjs/static` 동급)

- **왜 중요**: 전통적인 웹 앱 (React/Vue SPA 서빙, 파일 다운로드, 이미지 호스팅)을 AdonisJS로 만들 때 `serveStatic`은 필수다. 이게 없으면 컨트롤러가 `/favicon.ico`와 `/robots.txt`를 수동으로 처리한다.
- **제안 모듈**: `nexus/static` (작음)
- **기능**:
  - `app.use('/public/*', serveStatic({ root: './public' }))`
  - Cache-Control 헤더
  - ETag 지원
  - Range 요청 (비디오/대용량 파일용)

### 3.5 Encryption / Hash (`@adonisjs/encryption`, `@adonisjs/hash`)

- **왜 중요**: 애플리케이션 레벨 암호화 헬퍼 — PII 암호화(at rest), API 키 해싱, 보안 토큰 생성. 이것 없이는 모든 서비스가 자체 crypto를 굴리고(잘못된다).
- **제안 모듈**: `nexus/crypto`
- **기능**:
  - `crypto.encrypt(plaintext, key?)` / `crypto.decrypt(ciphertext, key?)`
  - `hash.make(value)` / `hash.verify(value, hashed)` (argon2 / bcrypt)
  - `random.token(length)` 보안 랜덤 문자열
  - 설정 가능한 알고리즘 + 키 회전

### 3.6 Bodyparser / multipart (`@adonisjs/bodyparser` 동급)

- **왜 중요**: Hono는 기본 body parser가 있지만, multipart / 파일 업로드 / 스트리밍이 내장되어 있지 않다. AdonisJS는 multipart를 네이티브로 처리하는 강력한 bodyparser를 제공.
- **제안 모듈**: `nexus/bodyparser`
- **기능**:
  - JSON, form-urlencoded, multipart/form-data
  - 파일 업로드 스트리밍 (디스크 버퍼링 없음)
  - 설정 가능한 크기 제한
  - 타입 안전한 `@UploadedFile()` 데코레이터

### 3.7 Multi-guard auth

- **왜 중요**: AdonisJS의 auth는 **한 프로젝트에서 여러 가드를 지원**한다 — 예: admin은 세션 쿠키, 모바일 클라이언트는 access token, 내부 서비스는 basic auth. NexusJS의 better-auth 통합은 **프로젝트당 하나의 auth 시스템**.
- **제안 모듈**: `nexus/auth` 확장
- **기능**:
  - 여러 `AuthGuard` 인스턴스 (session, token, basic)
  - 라우트별 `@UseGuard('token')` 선택
  - 공유 user 테이블; 다른 세션 전략

### 3.8 Lucid ORM 동급 — first-party ORM 통합

- **왜 중요**: 이것이 **가장 큰 단일 갭**이다. Lucid는 AdonisJS의 중심이 되어서 "Lucid 없는 AdonisJS"는 다른 프레임워크처럼 느껴진다. Drizzle 옵션이 있지만, 마이그레이션 / 시더 / 팩토리를 갖춘 first-party ORM이 없다.
- **제안 모듈**: `nexus/lucid`
- **기능**:
  - 모델의 `@column()` / `@hasMany()` 데코레이터
  - `Model.query()`, `.find()`, `.create()` 정적 API
  - 모델 diff에서 마이그레이션 생성
  - 시더 + 팩토리 함수 (`@faker-js/faker` 통합)
  - 내장 페이지네이션 (`Model.query().paginate(1, 20)`)
- **결정**: 이것은 **수개월 프로젝트**다. 둘 중 하나:
  1. Drizzle을 Lucid 스타일 데코레이터 API로 래핑 (`nexus/lucid`).
  2. Drizzle을 권위 ORM으로 권장하고 더 나은 `nx make:model` / `nx migrate` / `nx seed` CLI 명령어 제공.

---

## 4. Tier 3 — Nice-to-have

### 4.1 i18n (`@adonisjs/i18n` 동급)

- **용도**: 다국어 SaaS
- **제안 모듈**: `nexus/i18n`
- **기능**: JSON / YAML 로케일 파일, `@t()` 데코레이터, ICU 메시지 형식

### 4.2 WebSocket (`@adonisjs/websocket` 동급)

- **용도**: 채팅, 알림, 라이브 대시보드
- **제안 모듈**: `nexus/ws`
- **기능**: `@Socket()` 데코레이터, 채널, presence

### 4.3 Server-Sent Events

- **용도**: AI 스트리밍, 빌드 진행, 라이브 로그
- **제안 모듈**: `nexus/sse` (작음)

### 4.4 Lucid 스타일 시더 + 팩토리 (Tier 3.8의 일부)

- **용도**: dev / test 데이터 생성
- **제안 모듈**: `nexus/lucid`의 일부
- **기능**:
  - `factory.define(User, () => ({ ... }))` (`@faker-js/faker` 통합)
  - `db.seed()` 모든 시더 실행

### 4.5 Vine validator (Zod 대안)

- **용도**: Vine의 컴파일 타임 검증을 선호하는 팀
- **제안 모듈**: `nexus/vine` (어댑터)
- **참고**: Zod는 대부분의 앱에 충분히 좋다. Vine은 핫 패스에서 성능 이득. 낮은 우선순위.

### 4.6 Ace CLI 동등성 (`@adonisjs/ace` 동급)

- **용도**: 프로젝트-로컬 CLI 명령 (커스텀 시더, 리포트, 마이그레이션)
- **제안 모듈**: `nexus/ace` (또는 그냥 `nx ace`)
- **기능**: `nx make:command Foo`, `@args.string`, `@flags.boolean` 같은 데코레이터
- **참고**: 우리 현재 `nx`는 **scaffolding**용; `ace` 스타일 프로젝트-로컬 CLI는 다른 도구다. `nx make:foo`는 있지만 `nx mydomain:dothething`은 없다.

---

## 5. Quick wins (작은 노력, 큰 임팩트)

| 작업 | 노력 | 임팩트 |
|------|------|--------|
| `helmet()` + 보안 헤더 미들웨어 | 낮음 (시간) | 높음 |
| Pino 로거 통합 | 낮음 | 높음 (production) |
| `nx.config.ts`에서 CORS 설정 | 낮음 | 중간 |
| Health check 엔드포인트 | 낮음 | 높음 (K8s) |
| Encryption 헬퍼 (`crypto.encrypt`) | 낮음 | 중간 |
| `crypto.random.token()` | 매우 낮음 | 중간 |
| Bodyparser multipart | 중간 | 높음 |
| Static file 서빙 | 낮음 | 중간 |

**가장 효과 좋은 quick win 두 가지**:

1. **`@adonisjs/shield` 동급** — 즉시 작동하는 보안 기본값.
2. **Pino 로거** — 첫날부터의 observability.

---

## 6. 권장 v0.3+ 로드맵 (AdonisJS 형상)

AdonisJS의 강점은 NestJS와 다른 우선순위화를 제안한다. 다음은 두 분석을 합친 것이다.

### v0.3 — Production basics (NestJS 형상, 필수)

1. `nexus/health` — K8s / 모니터링
2. `nexus/config` — env 검증
3. `nexus/throttle` — rate limiting
4. `nexus/logger` — Pino 통합
5. **Pino / helmet / CORS 미들웨어 번들**
6. `nx migrate` — Drizzle Kit 통합

### v0.4 — AdonisJS batteries (the "indie hacker" 마일스톤)

7. `nexus/shield` — CSRF / XSS / 보안 헤더 기본 활성화
2. `nexus/drive` — 스토리지 추상화 (로컬 / S3 / R2)
3. `nexus/mail` — MJML 통합 이메일
4. `nexus/bodyparser` — multipart / 파일 업로드
5. `nexus/static` — serveStatic 미들웨어
6. `nexus/crypto` — encryption + hash 헬퍼
7. **Multi-guard auth** 확장

### v0.5 — First-party ORM (the "batteries-included" 마일스톤)

14. `nexus/lucid` — Lucid 스타일 ORM API (Drizzle 위)
    - `@column()` 데코레이터
    - 마이그레이션 생성기
    - Seeder + factory 지원
    - 페이지네이션 헬퍼

### v0.6 — Distributed

15. `nexus/cache` — in-memory + Redis
2. `nexus/redis` — first-party Redis 클라이언트 wrapper
3. `nexus/microservice` — TCP / Redis / NATS
4. `nexus/i18n`

### v0.7 — Realtime

19. `nexus/ws` — WebSockets
2. `nexus/sse` — SSE
3. `nexus/tracing` — OpenTelemetry

### v0.8 — v1.0 hardening

22. `nexus/feature-flag`
2. `nexus/metrics` — Prometheus
3. 안정적인 public API surface (semver)

---

## 7. 정직한 평가

두 비교는 **다른 그림**을 그린다.

### NestJS 비교 헤드라인

> "NexusJS는 올바른 아키텍처를 가지고 있지만 production 배포를 위한
> 20개 작은 모듈이 빠져 있다."

### AdonisJS 비교 헤드라인

> "NexusJS는 올바른 아키텍처를 가지고 있지만 **가장 큰 batteries**가
> 빠져 있다: first-party ORM (Lucid), 파일 스토리지 (Drive), 이메일
> (Mail), 보안 기본값 (Shield)."

AdonisJS 비교가 **덮기 더 어렵다**. Lucid 동급 작업만 **6개월 프로젝트**이며,
Drizzle을 Lucid 스타일 데코레이터 API로 래핑하더라도 **2-3개월**이다.

**두 갭 목록은 Tier 1에서 상당히 겹친다** (health, config, throttle,
logger, helmet). 그것들은 어떤 비교를 우선시하든 쉬운 win이다.

Tier 2 / v0.4 우선순위는 **갈라진다**:

- NestJS 중심: WebSockets, GraphQL, microservices
- AdonisJS 중심: Drive, Mail, Shield, bodyparser, Lucid

실용적 타협: **AdonisJS Tier 2 세트를 먼저 출시** — 모듈당 범위가 더
작고, 한 모듈이 더 많은 사용 사례를 커버하기 때문이다 (Drive + Mail +
Shield를 합쳐도 GraphQL 하나보다 작다).

---

## 8. 무엇을 건너뛸까 (NestJS 우선이지만 AdonisJS는 아닌 것)

**NestJS는 있지만 AdonisJS는 없는** 기능들도 여전히 중요하다. 이것들은
*AdonisJS-형상* 우선순위 목록에는 없다.

- **GraphQL** — AdonisJS도 이것을 제공하지 않는다. 연기.
- **Microservices transport** — AdonisJS도 이것을 제공하지 않는다.
  연기.
- **gRPC** — 연기.
- **Hybrid HTTP + microservice app** — 연기.

AdonisJS 자체도 이 영역에서는 경쟁하지 않는다. 대상 청중에 맞지 않는다.

---

## 9. 전략적 비교

| 청중 | 현재 최고 | 경쟁적이 되는 시점 |
|----------|----------------|---------------------------|
| **CRUD / SaaS 백엔드** | AdonisJS (batteries) | NexusJS가 `nexus/lucid` + `nexus/mail` + `nexus/drive` 출시 |
| **SPA / 모바일용 REST API** | 동등 | NexusJS가 `nexus/openapi` + `nexus/throttle` 출시 |
| **Microservices / distributed** | NestJS | NexusJS가 `nexus/microservice` 출시 |
| **GraphQL BFF** | NestJS | NexusJS가 `nexus/graphql` 출시 |
| **Edge / Workers-native** | Hono / Fresh | **이미 NexusJS의 강점** |
| **Bun-native / Drizzle** | Elysia | **이미 NexusJS의 강점** |

NexusJS의 기회는 **"Bun-native + batteries-included"** 틈새에서
명백한 선택지가 되는 것이다 — Node 생태계에서 AdonisJS가 차지하고
있는 그 틈새. 이것은 AdonisJS 비교의 Tier 2 (Lucid, Drive, Mail,
Shield)를 요구한다.

---

## 10. 참고

- [`nestjs-comparison.md`](./nestjs-comparison.md) — 자매 분석 (같은 구조)
- [`../README.md`](../../README.md) — 현재 상태 & 로드맵
- [`../user-guide/`](../../user-guide/) — 기존 모듈 가이드
- [`../design/`](../../design/) — 기존 설계 문서
- [AdonisJS 문서](https://docs.adonisjs.com) — 비교 기준
- [@adonisjs/lucid](https://lucid.adonisjs.com) — 학습할 ORM
- [FlyDrive](https://github.com/Slynova-Org/fly-drive) — AdonisJS가 래핑하는 스토리지 추상화
