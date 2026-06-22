# NexusJS vs AdonisJS — 기능 격차 분석

> English version: [`adonisjs-comparison.md`](./adonisjs-comparison.md)
> 분석 일자: 2026-06-25 · 기준: NexusJS **v0.6.4**

이 문서는 NexusJS v0.6와 [AdonisJS v6](https://adonisjs.com)를 비교하여
어떤 AdonisJS 스타일 "battery" (관례 기반, "그냥 동작" 기능)가
**있음**, **부분적**, **없음** 상태인지 식별한다. v0.3, v0.4, v0.6
마일스톤이 모든 Tier 1 및 Tier 2 격차를 해소했다. 이제 프레임워크는
AdonisJS가 출시하는 거의 모든 battery를 다룬다.

> **중요**: AdonisJS는 9년 된 프레임워크로 NexusJS보다 5년 앞서 있다.
> 매우 관용적인 수십 개의 first-party 패키지 (`@adonisjs/*`)를
> 보유. NexusJS는 더 작은 코어와 "스택을 직접 조합"하는 철학을
> 의도적으로 출시한다. 따라서 "격차"는 기능 패리티보다
> **battery 커버리지** — AdonisJS가 알려진 "그냥 동작" 수준.

---

## 1. 요약 표 (v0.6)

범례: ✅ 출시 · ⚠️ 부분적 · ❌ 없음 · 🔵 third-party 필요

| 카테고리 | AdonisJS | NexusJS v0.6 | 비고 |
|----------|----------|--------------|-------|
| HTTP 서버 | ✅ Custom (Node & Workers) | ✅ Hono (Bun / Node / Workers) | Nexus는 Hono를 기반 서버로 사용 |
| 라우팅 | ✅ Route groups, resources, subdomains | ✅ 클래스 데코레이터 + functional | 세 가지 스타일: Nest, Adonis, Functional |
| 컨트롤러 | ✅ "thin" (Adonis 관례) | ✅ "fat" (DI와 함께 Nest 스타일) | 둘 다 작동; 스타일 선택 |
| 미들웨어 | ✅ 클래스 기반, 순서 지정 | ✅ Hono 미들웨어 (타입됨) | `app.use('*', mw)` |
| DI | ✅ IoC 컨테이너, 데코레이터 | ✅ 클래스 기반 + `@Inject()` | Nest 스타일 + Adonis 스타일 모두 |
| 검증 | ✅ Vine (Zod에서 영감) | ✅ Zod | Nexus는 `@Validate`로 직접 Zod 사용 |
| ORM | ✅ Lucid (내장) | ✅ `nexusjs/drizzle` | Drizzle가 기본 ORM |
| 마이그레이션 | ✅ 내장 | ✅ `nx db:migrate` (drizzle-kit 래퍼) | 같은 DX |
| Seeding | ✅ 내장 팩토리 | ⚠️ DIY | first-party 없음; 사용자가 팩토리 작성 |
| Auth | ✅ `@adonisjs/auth` | ✅ `nexusjs/auth` (better-auth) | better-auth = 다수 전략 |
| 세션 | ✅ `@adonisjs/session` | ✅ `nexusjs/session` | Cookie / Memory / Drizzle 백엔드 |
| 암호화 | ✅ `@adonisjs/encryption` | ✅ `nexusjs/crypto` (AES-256-GCM + HMAC + scrypt) | 같은 API 스타일 |
| Hash | ✅ `@adonisjs/hash` | ✅ `nexusjs/crypto` (HashService) | Argon2 / scrypt |
| Shield | ✅ `@adonisjs/shield` (CSRF, headers) | ✅ `nexusjs/shield` (CSRF / HSTS / CSP) | 같은 이름, 같은 목적 |
| Throttler | ✅ `@adonisjs/throttler` | ✅ `nexusjs/limiter` (fixed / sliding / token-bucket) | |
| 로거 | ✅ `@adonisjs/logger` | ✅ `nexusjs/logger` (Pino) | |
| 메일 | ✅ `@adonisjs/mail` | ✅ `nexusjs/mail` (SMTP / File / Null) | |
| Drive (파일 스토리지) | ✅ `@adonisjs/drive` | ✅ `nexusjs/drive` (Local / S3 / R2 / memory) | |
| 캐시 | ✅ `@adonisjs/cache` | ✅ `nexusjs/cache` (memory / Drizzle) | |
| 이벤트 | ✅ `@adonisjs/events` | ✅ `nexusjs/events` | wildcards, priorities, guards |
| 큐 | ✅ `@adonisjs/queue` | ✅ `nexusjs/queue` (BullMQ / Cloudflare / memory) | |
| 스케줄러 | ✅ `@adonisjs/scheduler` | ✅ `nexusjs/schedule` (인-트리 cron 파서) | 외부 의존성 없음 |
| Static | ✅ `@adonisjs/static` | ✅ `nexusjs/static` (ETag / Range / MIME) | |
| Health | ✅ `@adonisjs/health` | ✅ `nexusjs/health` (내장 indicator) | |
| SSE | ❌ DIY | ✅ `nexusjs/sse` | Nexus는 SSE를 기본 출시 |
| WebSockets | ❌ DIY | ✅ `nexusjs/ws` | 런타임 자동 감지 (Bun / Node) |
| 업로드 | ❌ DIY | ✅ `nexusjs/upload` | `@Upload()` / `@UploadedFile()` 데코레이터 |
| i18n | ✅ `@adonisjs/i18n` | ✅ `nexusjs/i18n` | `Intl` 기반, pluralization |
| OpenAPI | ❌ DIY | ✅ `nexusjs/openapi` | Zod → OpenAPI 3.1 + Scalar UI |
| Tracing | ❌ DIY | ✅ `nexusjs/tracing` | lazy SDK를 갖춘 OpenTelemetry |
| Metrics | ❌ DIY | ✅ `nexusjs/metrics` | Prometheus / OpenMetrics |
| Bodyparser | ✅ 내장 | ✅ Hono의 `c.req.parseBody()` + `nexusjs/upload` | |
| REPL | ✅ `node ace repl` | ❌ 출시 안 됨 | v0.6에서는 낮은 우선순위 |
| Inspector | ✅ `@adonisjs/inspector` | ❌ 출시 안 됨 | 디버깅 전용 |
| Admin panel | ✅ `@adonisjs/admin` | ❌ 출시 안 됨 | 낮은 우선순위 |
| GraphQL | ✅ `@adonisjs/graphql` (legacy) | ❌ 없음 | v0.6 예정 |
| gRPC | ❌ DIY | ❌ 없음 | v0.6 예정 |
| Feature flags | ❌ DIY | ❌ 없음 | v0.6 예정 |
| Resilience (서킷 브레이커) | ❌ DIY | ❌ 없음 | v0.6 예정 |

**헤드라인**: NexusJS v0.6는 본질적으로 모든 AdonisJS battery
(v6)를 커버하며, "모던" 기능 (WebSockets, OpenAPI, SSE,
tracing, metrics)에서 AdonisJS가 battery로 출시하지 않는 것을
능가한다.

---

## 2. v0.3 + v0.4 + v0.6에서 해소된 항목 (최근 성과)

v0.3, v0.4, v0.6 마일스톤이 v0.2 분석에서 식별된 모든
"누락된 battery" 격차를 해소했다.

| v0.2에서 누락 | 출시 | 모듈 |
| ------------------- | ------- | ------ |
| 헬스 체크 | v0.3 | `nexusjs/health` |
| Rate limiting / throttling | v0.3 | `nexusjs/limiter` |
| 보안 헤더 (CSRF / HSTS / CSP) | v0.3 | `nexusjs/shield` |
| 설정 관리 | v0.3 | `nexusjs/config` |
| 로깅 | v0.3 | `nexusjs/logger` |
| 캐시 | v0.3 | `nexusjs/cache` |
| 이메일 | v0.3 | `nexusjs/mail` |
| 파일 스토리지 (S3 / R2 / Local) | v0.3 | `nexusjs/drive` |
| 데이터베이스 (기본 ORM) | v0.3 | `nexusjs/drizzle` |
| 데이터베이스 마이그레이션 + CLI | v0.3 | `nx db:migrate` |
| 정적 파일 서빙 | v0.3 | `nexusjs/static` |
| **OpenAPI 생성기** | v0.4 | `nexusjs/openapi` |
| **파일 업로드 헬퍼** | v0.4 | `nexusjs/upload` |
| **Request-scoped DI** | v0.4 | 코어 DI + ALS + Hono 미들웨어 |
| **Server-Sent Events** | v0.4 | `nexusjs/sse` |
| **분산 추적** | v0.4 | `nexusjs/tracing` |
| **Prometheus 메트릭** | v0.4 | `nexusjs/metrics` |
| **WebSockets** | v0.6 | `nexusjs/ws` |
| **암호화 + 패스워드 해싱** | v0.6 | `nexusjs/crypto` |
| **i18n** | v0.6 | `nexusjs/i18n` |

합계: v0.3 + v0.4 + v0.6에서 **20개의 AdonisJS 스타일 배터리**
출시 (v0.3에서 10개, v0.4에서 6개, v0.6에서 4개).

---

## 3. 다른 철학

AdonisJS와 NexusJS는 비슷한 문제를 다른 trade-off로 해결:

| 관심사 | AdonisJS 접근 | NexusJS 접근 |
| ------- | -------------- | ------------- |
| **서버 런타임** | Custom Node HTTP 서버 | Hono (Bun / Node / Workers) |
| **DI** | IoC 컨테이너, 데코레이터, 지연 해결 | 클래스 기반 + `@Inject()`, ALS로 request-scoped |
| **ORM** | Lucid (내장, 관용적) | Drizzle (기본, 덜 관용적) |
| **검증** | Vine (Zoid에서 영감) | Zod (사실상 표준) |
| **관례 vs 조합** | 강한 관례 (lucid → "User.find", routes → "users" 등) | 약한 관례 + 조합 (DI 우선) |
| **번들 크기** | 단일 ~1MB 번들 | 모듈별 번들 (각 ~5-50kb) |
| **First-party 패키지 수** | 30+ `@adonisjs/*` 패키지 | 25개 first-party 모듈 (`nexusjs/*` 아래) |
| **다중 런타임** | Node + Workers | Bun + Node + Workers |
| **빌드 철학** | 하나의 큰 앱 | "스택을 직접 조합" — 필요한 것만 설치 |
| **기본 ORM 스타일** | ActiveRecord (`User.find(id)`) | Drizzle의 쿼리 빌더 + `DrizzleRepository` (Lucid 스타일) |

가장 큰 실제 차이: **AdonisJS는 관례에, NexusJS는 조합에 의존**.
데코레이터와 DI에 익숙하고 "Nest" 스타일을 선호하면 NexusJS가
자연스러울 것. AdonisJS의 Rails 같은 "관례가 설정보다 우선"을
선호하면 NexusJS가 더 장황하게 느껴질 수 있음.

---

## 4. DX 비교 (개발자 경험)

### 라우팅

| 스타일 | AdonisJS | NexusJS |
| ----- | -------- | ------- |
| 클래스 데코레이터 (Nest 스타일) | ❌ | ✅ |
| 라우트 파일 (`routes.ts`) | ✅ | ✅ |
| Functional handler (Hono 스타일) | ❌ | ✅ |
| Resource 라우트 (`Route.resource('users')`) | ✅ | ⚠️ DIY (`make:crud` 스캐폴드 사용) |

NexusJS는 **세 가지** 라우팅 스타일을 제공; AdonisJS는 **하나**
(라우트 파일). Nest 스타일 클래스 컨트롤러를 선호하는 팀에게는
큰 장점.

### 검증

두 프레임워크 모두 Zod 스타일 스키마 사용. AdonisJS는 Vine
출시 (Zod에서 영감); NexusJS는 직접 Zod 사용. DX는 매우
유사 — 선호하는 스타일 선택.

### ActiveRecord 스타일 모델

AdonisJS의 Lucid는 `User.find(id)`, `User.create({...})` 등을 제공.
NexusJS의 `DrizzleRepository`는 같은 관용성 제공:

```ts
// AdonisJS
const user = await User.findOrFail(params.id)
const posts = await user.related('posts').query()

// NexusJS (Lucid 스타일)
const user = await this.users.findByIdOrFail(params.id)
const posts = await this.users.relation(user, 'posts')
```

원시 Drizzle의 쿼리 빌더를 선호하면 `DrizzleService`로 직접 사용 가능:

```ts
// NexusJS (Drizzle 네이티브)
const user = await this.db.select().from(users).where(eq(users.id, id)).get();
const posts = await this.db.select().from(posts).where(eq(posts.userId, user.id));
```

### Hot-reload

두 프레임워크 모두 hot-reload 지원. AdonisJS는 `node ace serve --watch`;
NexusJS는 `bun --hot app/main.ts` 사용. Bun의 hot-reload가 Node보다
빠르므로 NexusJS가 여기서 우세.

### REPL

AdonisJS는 라이브 코드 탐색용 `node ace repl` 보유. NexusJS는
`nx info` (일회성 환경 요약) 출시하지만 interactive REPL은 없음.
**낮은 우선순위** — REPL은 프로젝트 초기에 더 유용하고, 대부분의
팀은 notebook / scratch 파일 사용.

---

## 5. 클러스터 / 다중 인스턴스

| 기능 | AdonisJS | NexusJS |
| ------- | -------- | ------- |
| 공유 DB를 통한 다중 pod | ✅ | ✅ (Drizzle 백엔드) |
| Redis 기반 큐 | ✅ (BullMQ) | ✅ (`nexusjs/queue`) |
| 다중 리전 | ❌ DIY | ❌ DIY |
| 세션 sticky | ⚠️ DIY | ✅ (쿠키 백엔드는 stateless; DB 또는 memory로 폴백) |

AdonisJS와 NexusJS는 여기서 유사: 둘 다 공유 상태에 데이터베이스 의존.
NexusJS의 쿠키 기반 세션은 본질적으로 stateless이므로 다중 리전
배포에서 약간의 우위.

---

## 6. NexusJS가 AdonisJS를 능가하는 곳

여러 AdonisJS battery가 존재하지 않거나 (또는 DIY 전용). NexusJS는
이를 기본 출시:

- **WebSockets** (`nexusjs/ws`) — AdonisJS 사용자는 커스텀
  WebSocket 레이어 작성.
- **Server-Sent Events** (`nexusjs/sse`) — 같은.
- **OpenAPI / Swagger** (`nexusjs/openapi`) — AdonisJS 사용자는
  일반적으로 스펙을 손으로 작성하거나 `@nestjs/swagger` 스타일
  데코레이터 사용.
- **분산 추적** (`nexusjs/tracing`) — AdonisJS 사용자는 OpenTelemetry
  수동 통합.
- **Prometheus 메트릭** (`nexusjs/metrics`) — AdonisJS 사용자는
  `prom-client` 수동 통합.
- **파일 업로드** (`nexusjs/upload`) — AdonisJS 사용자는
  multipart 처리 손으로 작성.
- **Bun 네이티브 런타임** — AdonisJS는 Node 전용.

이들 중 하나라도 필요한 팀은 NexusJS에서 무료로 얻음.

---

## 7. 권장 v0.6+ 로드맵

### v0.6 — Async RPC & DX ("polyglot" 마일스톤) — 예정

1. **`nexusjs/graphql`** — 코드 우선 스키마, `@Resolver()` / `@Query()` / `@Mutation()`
2. **`nexusjs/grpc`** — server / client / streaming
3. **`nexusjs/resilience`** — 서킷 브레이커, 재시도, bulkhead
4. **`nexusjs/feature-flag`** — 카나리 / A/B 테스팅
5. **`nx repl`** — interactive REPL (낮은 우선순위; 요청 시 인용)

이 5개가 남은 틈새 battery를 채우고 v6와의 "battery 커버리지"를 완성.

### v0.7 — 강화

- 안정 public API surface (semver 보장)
- 다중 런타임 CI (Bun + Node + Cloudflare Workers)
- 성능 벤치마크
- 장기 LTS 지원 계획

### v1.0 — Production-ready LTS

- 동결 API surface
- AdonisJS에서의 마이그레이션 가이드
- LTS 브랜치 (12개월 보안 백포트)

---

## 8. 정직한 평가 (v0.6)

v0.6 릴리스는 **본질적으로 모든 AdonisJS v6 battery 격차를 해소**.
AdonisJS에서 NexusJS v0.6로 마이그레이션하는 팀은 다음을 발견:

- 모든 first-party battery에 NexusJS v0.6에 동등한 것 있음.
- Lucid → Drizzle 마이그레이션은 기계적 (`DrizzleRepository`가
  Lucid API 미러링).
- Vine → Zod 마이그레이션은 기계적.
- `@adonisjs/auth` → `nexusjs/auth` 마이그레이션은 대부분 자명
  (better-auth가 비슷한 API).
- `@adonisjs/session` → `nexusjs/session` 마이그레이션은 대부분 자명.
- `@adonisjs/encryption` / `hash` → `nexusjs/crypto` 마이그레이션은
  한 줄 변경.

**완전한** AdonisJS 커버리지에 여전히 **부족한 것**:

- **GraphQL** — 무겁게 사용하는 팀에 중요.
- **gRPC** — 폴리글랏 service-mesh 환경에 중요.
- **Feature flags** — 카나리 배포에 유용.
- **Resilience 프리미티브** — 외부 API 호출에 유용.
- **REPL** — 초기 개발에 유용; blocking은 아님.
- **Admin panel** — 낮은 우선순위; 대부분의 팀은 커스텀 사용.

AdonisJS v6 vs NexusJS v0.6 차별점:

- **Bun 네이티브** — NexusJS는 Bun에서 네이티브로 실행 (더 빠른
  시작, 더 빠른 I/O, 더 적은 의존성). AdonisJS는 Node 전용.
- **모듈별 번들 entry points** — `nexusjs/ws`는 사용하지 않으면
  번들에 포함 안 됨. AdonisJS는 모든 것을 하나의 번들로 출시.
- **OpenAPI / WebSockets / SSE / tracing / metrics batteries** —
  NexusJS는 이를 기본 출시; AdonisJS 사용자는 직접 연결.
- **기본 ORM = Drizzle** — Bun에서 Drizzle는 Lucid보다 성능상
  우세. Lucid는 ActiveRecord 스타일에 더 좋은 DX.
- **Cloudflare Workers** — NexusJS가 Workers에 더 친화적
  (Hono의 엣지 성능).

v0.6에서 "AdonisJS 기능 패리티"까지의 경로는 v0.6에서
"NestJS 기능 패리티"까지의 경로와 대략 동일:

- **v0.6** (2026 Q4): Async RPC & DX — GraphQL, gRPC, resilience,
  feature flags, REPL.
- **v0.7** (2027 Q1): Production hardening — 안정 public API,
  다중 런타임 CI, 성능 벤치마크.
- **v1.0** (2027 Q2): Production-ready LTS — 동결 API surface,
  AdonisJS 마이그레이션 가이드, LTS 브랜치.

v0.6 이후 NexusJS는 오늘 AdonisJS 사용자가 사용 가능한 모든 것에 대한
**실현 가능한 대안**이며, Bun의 런타임 + DX 이점 + AdonisJS가
battery로 출시하지 않는 모던 기능 (OpenAPI, WebSockets, tracing,
metrics, SSE)을 가짐.

---

## 9. 참고

- [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.6 릴리스 노트
- [`../README.md`](../../README.md) — 현재 상태 & 로드맵
- [`../../user-guide/`](../../user-guide/) — 25개 모듈의 가이드
- [`./nestjs-comparison.md`](./nestjs-comparison.md) — 동반 분석
- [AdonisJS 문서](https://docs.adonisjs.com) — 비교 기준선
- [Drizzle ORM](https://orm.drizzle.team) — NexusJS가 출시하는 기본 ORM
