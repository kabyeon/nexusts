# NexusJS vs AdonisJS — 기능 격차 분석

> English version: [`adonisjs-comparison.md`](./adonisjs-comparison.md)
> 분석 일자: 2026-06-21 · 기준: NexusJS **v0.3.0**

이 문서는 NexusJS v0.3과 [AdonisJS v6](https://adonisjs.com)를
비교하여 핵심 백엔드 기능 중 **존재**, **부분 존재**, **누락** 상태를
식별한다. v0.3 마일스톤은 기본 ORM으로 Drizzle를 채택하여 가장 큰
격차(Lucid ORM)를 해소했다.

> **중요**: AdonisJS와 NestJS는 겹치지만 구별되는 문제를 해결한다.
> NestJS는 "HTTP도 할 수 있는 DI 프레임워크"에 가깝고, AdonisJS는
> "자체 ORM, 템플릿 엔진, CLI를 갖춘 풀스택 배터리 포함 백엔드"에
> 가깝다. 기능 단위 비교는 AdonisJS에 **배터리** 측면에서, NestJS에
> **아키텍처 유연성** 측면에서 유리하다. NexusJS는 두 프레임워크의
> 장점을 결합하는 것을 목표로 한다: AdonisJS 스타일 배터리(Lucid
> 급 ORM, mail, drive, shield, cache)와 NestJS 스타일 DI / 멀티 패러다임
> 라우팅.

---

## 1. 요약 표 (v0.3)

범례: ✅ 출시됨 · ⚠️ 부분 지원 · ❌ 없음 · 🔵 써드파티 필요

| 카테고리 | AdonisJS | NexusJS v0.3 | 비고 |
|----------|----------|--------------|------|
| HTTP / 라우팅 | ✅ Resource routes, groups, middleware | ✅ 3개 스타일 | 동등 |
| **ORM** | ✅ **Lucid** (1급, 배터리 포함) | ✅ **Drizzle** (1급, 5개 dialect) | **예전 큰 격차 →** 이제 Drizzle의 Lucid 스타일 ergonomics로 동등 |
| **Validator** | ✅ **VineJS** (1급, 매우 빠름) | ⚠️ Zod만 | 기능적으로 동등; Vine이 중요하면 격차 |
| **Auth** | ✅ **Multi-guard** (session / access_tokens / basic_auth) | ⚠️ `nexus/auth` (better-auth) | better-auth는 다중 전략 지원, `nexus/auth` 표면은 얇은 래퍼 |
| **Mail** | ✅ **@adonisjs/mail** with MJML | ✅ `nexus/mail` (SMTP / File / Null + MJML) | 동등 |
| **Drive (storage)** | ✅ **@adonisjs/drive** (S3 / GCS / local) | ✅ `nexus/drive` (memory / Local / S3 / R2) | **예전 격차 →** 이제 동등 |
| **Shield** (CSRF / XSS) | ✅ 내장 | ✅ `nexus/shield` | **예전 격차 →** 이제 동등 |
| **Static** | ✅ `serveStatic` 미들웨어 | ✅ `nexus/static` | **예전 격차 →** 이제 동등 |
| **Encryption / Hash** | ✅ `@adonisjs/encryption`, `@adonisjs/hash` | ❌ 없음 | 여전히 격차 |
| **Bodyparser** | ✅ Multipart, file upload, streams | ⚠️ Hono 네이티브, 데코레이터 래퍼 없음 | Hono의 `c.req.parseBody()` 동작 |
| Health checks | ✅ `@adonisjs/health` | ✅ `nexus/health` | **예전 격차 →** 이제 동등 |
| Cache | ✅ `@adonisjs/cache` (in-memory / Redis) | ✅ `nexus/cache` (memory / Drizzle) | **예전 격차 →** 이제 동등 |
| Logging | ✅ Pino 통합 | ✅ `nexus/logger` (Pino) | **예전 격차 →** 이제 동등 |
| CORS | ✅ `@adonisjs/cors` | ⚠️ Hono 미들웨어 | 동등 (Hono에 내장) |
| Session | ✅ `@adonisjs/session` (cookie / memory / Redis) | ✅ `nexus/session` (cookie / memory / Drizzle) | 동등; Nexus는 Drizzle 백엔드 추가 |
| Queue | ✅ `@adonisjs/queue` (BullMQ 사용) | ✅ `nexus/queue` (BullMQ / Cloudflare / Memory) | 동등 |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `nexus/schedule` (`@Cron` / `@Interval` / `@Timeout`) | 동등 |
| Events | ✅ `@adonisjs/events` | ✅ `nexus/events` (`@OnEvent` with wildcards) | 동등 |
| i18n | ✅ `@adonisjs/i18n` | ❌ 없음 | 여전히 격차 |
| WebSocket | ✅ `@adonisjs/websocket` | ❌ 없음 | 여전히 격차 |
| Realtime (SSE) | ⚠️ DIY | ⚠️ DIY (예정 `nexus/sse`) | 동등 |
| Microservices | ⚠️ DIY | ⚠️ `nexus/queue` (잡 큐만) | 둘 다 현재는 queue에 의존 |
| CLI / Scaffolding | ✅ **Ace** (성숙, vscode 통합) | ✅ **`nx`** (신규, 유사 표면) | 동등 |
| Test framework | ✅ **Japa** (1급) | ⚠️ Vitest (외부) | 동등 (Vitest 우수) |
| DI | ✅ IoC 컨테이너, 데코레이터 | ✅ 데코레이터 기반 | 동등 |

**v0.2에서의 주요 변화**: 6개의 원래 "큰 격차"가 해소되었다 — 가장
주목할 만한 것은 **ORM** (Drizzle의 Lucid 스타일 ergonomics + 멀티
dialect 지원)과 **Drive / Mail / Cache / Shield / Static / Health /
Logging** 이다. 잔존 격차(encryption, i18n, WebSocket)는 Tier 3다.

---

## 2. v0.3에서 해소된 항목 (최근 성과)

v0.3 마일스톤은 가장 많이 요청된 AdonisJS 스타일 배터리를
출시했다. 출시된 내용은 다음과 같다:

| v0.2에서 누락 | v0.3에서 출시 | 모듈 |
| -------------- | -------------- | ------ |
| Lucid 등가 ORM | ✅ | `nexus/drizzle` (5개 dialect + `DrizzleModel` + `DrizzleRepository` + `db.migrate` + `db.raw\`\``) |
| `@adonisjs/mail` | ✅ | `nexus/mail` (Null / File / SMTP transport + 옵션 peer MJML) |
| `@adonisjs/drive` | ✅ | `nexus/drive` (Memory / Local / S3 / R2) |
| `@adonisjs/shield` | ✅ | `nexus/shield` (CSRF + HSTS + CSP + X-Frame-Options + Referrer-Policy) |
| `@adonisjs/health` | ✅ | `nexus/health` (live/ready/startup + indicator) |
| `@adonisjs/cache` | ✅ | `nexus/cache` (memory LRU / Drizzle + 태그 기반 무효화) |
| Pino 로깅 | ✅ | `nexus/logger` (Pino transport + AsyncLocalStorage 요청 컨텍스트) |
| `serveStatic` | ✅ | `nexus/static` (Hono 미들웨어 + ETag + Range + 경로 조작 방지) |
| DB session 백엔드 | ✅ | `DrizzleSessionStorage` (기존 cookie / memory 백엔드에 추가) |
| CLI를 통한 마이그레이션 | ✅ | `nx migrate` + `nx migrate --generate` (Drizzle 기반) |

합계: v0.3에서 **10개의 AdonisJS 스타일 배터리** 출시.

---

## 3. Tier 1 — 잔존 필수 격차

### 3.1 Encryption / Hash (`@adonisjs/encryption` 등가)

- **왜 필수인가**: 많은 앱이 미사용 시 민감한 데이터(API 키, PII)를
  암호화하거나 비밀번호를 해시(인증 제공자)해야 한다. 1급
  헬퍼가 없으면 모든 프로젝트가 일관성 없이 재구현한다.
- **제안 모듈**: `nexus/crypto`
- **기능**:
  - `crypto.encrypt(plaintext, key) → string` (AES-256-GCM)
  - `crypto.decrypt(ciphertext, key) → string`
  - `crypto.hash(plaintext) → string` (bcrypt / argon2)
  - `crypto.verify(plaintext, hash) → boolean`
  - 비밀 문자열에서 키 파생 (HKDF)

### 3.2 Multi-guard auth (`@adonisjs/auth` 등가)

- **현황**: `nexus/auth`는 better-auth를 래핑하며, better-auth는
  **여러 전략**(이메일/비밀번호, OAuth, passkey, 매직 링크)을
  지원한다. 하지만 `nexus/auth` API 표면은 현재 기본 `AuthService`만
  노출한다 — 1급 multi-guard 추상화가 없다.
- **제안**: `nexus/auth` 확장
- **기능**:
  - `AuthService.guard('web').signIn(...)` / `AuthService.guard('api').verify(token)`
  - guard별 설정 (세션 쿠키 vs JWT)
  - guard별 사용자 해석 전략

---

## 4. Tier 2 — 중요 (대부분 프로덕션 앱)

### 4.1 WebSocket (`@adonisjs/websocket` 등가)

- **사용 사례**: 채팅, 알림, 라이브 대시보드.
- **제안 모듈**: `nexus/ws`
- **기능**:
  - `@WebSocketGateway()` 데코레이터
  - `@SubscribeMessage('chat')` 핸들러
  - 룸 관리
  - `ws` (Node) 또는 Workers WebSocket 페어 기반

### 4.2 i18n (`@adonisjs/i18n` 등가)

- **사용 사례**: 다국어 SaaS.
- **제안 모듈**: `nexus/i18n`
- **기능**:
  - `t('users.welcome', { name })` API
  - 요청별 로케일 해석
  - JSON / YAML / gettext 호환 메시지 카탈로그

### 4.3 Bodyparser / file upload 헬퍼

- **왜**: 아바타, 첨부 파일, CSV 임포트. Hono 네이티브 API는
  동작하지만 타입 안전 데코레이터 래퍼가 없다.
- **제안 모듈**: `nexus/upload`
- **기능**: `@UploadedFile()`, `@UploadedFiles()`, 파일 검증, 스트리밍

---

## 5. Tier 3 — Nice-to-have

### 5.1 OpenAPI / Swagger

- **현황**: NestJS 분석에서는 Tier 1이지만, 여기서는 Tier 3이다.
  AdonisJS 자체가 1급 OpenAPI 모듈을 출시하지 않기 때문이다 — 커뮤니티
  `adonis-autodoc`에 의존한다.
- **제안 모듈**: `nexus/openapi`
- **기능**: Zod → OpenAPI, Scalar UI, 데코레이터

### 5.2 OpenTelemetry / tracing

- **제안 모듈**: `nexus/tracing`
- **기능**: OTLP 익스포터, `@Trace()` 데코레이터, 트레이스 컨텍스트 전파

### 5.3 Metrics (Prometheus)

- **제안 모듈**: `nexus/metrics`
- **기능**: `@Counter`, `@Histogram`, `@Gauge`, `/metrics` 엔드포인트

### 5.4 Resilience: 회로차단기 + 재시도

- **제안 모듈**: `nexus/resilience`
- **기능**: `@Retry()`, `@CircuitBreaker()`, 벌크헤드

### 5.5 Server-Sent Events (SSE)

- **제안 모듈**: `nexus/sse`
- **기능**: `SseStream` 반환 타입, `Last-Event-ID` 재연결

---

## 6. 빠른 성과

| 작업 | 노력 | 임팩트 | 비고 |
|------|------|--------|------|
| `nexus/crypto` (encryption + hash) | 낮음 | 높음 | 모든 프로젝트가 재구현; 1급으로 격차 해소 |
| `nexus/auth` multi-guard 확장 | 낮음 | 중간 | better-auth가 이미 지원; 래퍼가 빠짐 |
| `helmet()` 미들웨어 in `nexus/shield` | 매우 낮음 | 높음 | 드롭인 추가 |
| CORS 추상화 | 낮음 | 중간 | Hono에 내장; 일관된 설정이 핵심 |
| Multipart body parser 래퍼 | 낮음 | 중간 | 파일 업로드 헬퍼와 같은 패턴 |

가장 큰 단일 잔여 **배터리** 격차는 `nexus/crypto` — 모든 프로젝트가
필요로 하고 일관성 없이 재구현한다.

---

## 7. 권장 v0.4+ 로드맵

### v0.4 — Encryption + 실시간 토대

1. **`nexus/crypto`** — encryption + password hashing
2. **`nexus/ws`** — WebSockets
3. **`nexus/upload`** — 파일 업로드 헬퍼
4. **`nexus/sse`** — Server-Sent Events
5. **`nexus/auth` multi-guard 확장**
6. **요청 스코프 DI** — 코어 확장

이 6개는 **배터리** 이야기를 완성한다: AdonisJS 사용자가 NexusJS로
마이그레이션할 때 기존 코드 경로의 95%에 대해 기능 패리티를 갖게 된다.

### v0.5 — API 완성도

- `nexus/openapi` — Zod → OpenAPI, Scalar UI
- `nexus/i18n` — 다국어
- `nexus/tracing` — OpenTelemetry
- `nexus/metrics` — Prometheus
- `nexus/resilience` — 회로차단기, 재시도

### v0.6 — 분산 시스템

- `nexus/grpc` — gRPC
- `nexus/graphql` — GraphQL
- `nexus/microservice` — TCP / NATS / Redis 트랜스포트
- 안정적인 공개 API 표면 (semver 보장)

---

## 8. 정직한 평가 (v0.3)

v0.3 릴리스는 AdonisJS 비교를 **"많은 큰 격차"에서 "작은 Tier 1+2
격차"로** 변환했다. 가장 많이 요청된 AdonisJS 스타일 배터리 — ORM,
mail, drive, shield, cache, static, health, logging — 모두 이제
NexusJS의 1급이다.

AdonisJS v6 대비 NexusJS v0.3의 차별점:

| NexusJS 장점 | AdonisJS 장점 |
| ----------------- | ------------------- |
| Bun 네이티브 런타임, 더 빠른 시작 | 더 성숙한 생태계 (5년+) |
| Drizzle를 통한 5개 dialect ORM | 단일 Lucid ORM (postgres / sqlite / mysql) |
| 멀티 런타임: Bun / Node / Workers | 단일 런타임 (Node) |
| 3개 라우팅 스타일 (Nest / Adonis / Hono) | 단일 Adonis 스타일 라우터 |
| Drizzle의 태그드 템플릿 raw query (SQL 인젝션 안전) | Lucid의 query builder (타입 안전) |
| `nx` CLI가 모델과 마이그레이션 모두 스캐폴드 | `Ace` CLI가 둘 다 하지만 다른 명령으로 |
| Resource 한계는 옵션 peer dep (AWS SDK 사용 안 함) | 모든 배터리 사전 설치 (큰 번들) |

AdonisJS가 여전히 가지고 있고 NexusJS가 가지지 않은 것:

- Encryption / hash 헬퍼 (Tier 1)
- Multi-guard auth 추상화 (Tier 1, better-auth를 통해 부분 지원)
- WebSocket 모듈 (Tier 2)
- i18n (Tier 2)
- VineJS validator (논쟁 — Zod가 더 인기)

v0.3에서 "AdonisJS 기능 패리티"까지의 경로는 "NestJS 기능 패리티"와
대략 동일하다 — v0.4는 잔존 Tier 1+2 배터리를, v0.5는 API 완성도를,
v0.6은 분산 시스템 primitive를 추가한다.

v0.6 이후 비교는 대부분 **패러다임 vs 패러다임**이다: AdonisJS는
모든 것에 대해 단일 blessed way를, NexusJS는 3개 라우팅 스타일, ORM
선택, Bun을 제공한다. 새 프로젝트에는 NexusJS가 더 유연한
시작점이다.

---

## 9. 참고

- [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.3 릴리스 노트
- [`../README.md`](../../README.md) — 현재 상태 & 로드맵
- [`../../user-guide/drizzle.md`](../../user-guide/drizzle.md) — Lucid 등가 가이드
- [`../../user-guide/`](../../user-guide/) — 17개 모듈 가이드
- [`./nestjs-comparison.md`](./nestjs-comparison.md) — 동반 분석
- [AdonisJS 문서](https://docs.adonisjs.com) — 비교 기준
