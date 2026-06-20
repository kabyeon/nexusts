# NexusJS vs NestJS — Feature Gap Analysis

> 한국어 버전: [`nestjs-comparison.ko.md`](./nestjs-comparison.ko.md)
> 분석 일자: 2026-06-20 · 기준: NexusJS v0.2.0

This document compares NexusJS v0.2 against [NestJS](https://nestjs.com)
to identify which production-grade backend features are **present**,
**partially present**, or **missing**. The goal is to surface honest
gaps so the v0.3+ roadmap can be prioritized.

> **Important**: NestJS is a 7-year-old framework with ~10M weekly
> downloads and dozens of first-party packages. NexusJS is a young
> framework (v0.2, ~6 weeks of development). Comparing feature counts
> is misleading — the question is which **gaps block production use**.

---

## 1. Summary table

| Category | NestJS | NexusJS v0.2 | Notes |
|----------|--------|--------------|-------|
| HTTP / routing | ✅ GraphQL, WebSockets, gRPC, SSE, Fastify | ❌ Hono only | REST only |
| DI | ✅ Request-scoped, circular auto-resolve | ⚠️ Singleton only | - |
| Config | ✅ @nestjs/config, .env validation | ❌ Direct `process.env` | - |
| Security | ✅ helmet, throttler, CSRF, CORS | ❌ Hono middleware delegation | - |
| Database | ✅ TypeORM, Prisma, Mongoose, Sequelize | ⚠️ Drizzle optional only | No integration package |
| Cache | ✅ cache-manager (in-memory / Redis) | ❌ None | - |
| Logging | ✅ Built-in Logger (Winston / Pino adapters) | ❌ `console.log` only | - |
| Realtime | ✅ WebSocket, SSE, gRPC streaming | ❌ None | - |
| Microservices | ✅ TCP, Redis, NATS, Kafka, MQTT | ❌ None | - |
| API docs | ✅ @nestjs/swagger | ❌ No OpenAPI generator | - |
| Health checks | ✅ @nestjs/terminus | ❌ None | - |
| Email | ✅ @nestjs/mailer | ❌ None | - |
| File upload | ✅ multer integration | ❌ None | - |
| i18n | ✅ nestjs-i18n | ❌ None | - |
| Feature flags | ⚠️ DIY (no first-party) | ❌ None | NestJS also lacks this |
| Tracing | ✅ OpenTelemetry integration | ❌ None | - |
| Metrics | ✅ Prometheus integration | ❌ None | - |

---

## 2. Tier 1 — Critical for production

These are the **first** features to add. Most production backends
need them; lacking them blocks K8s deployment, exposes the API to
abuse, or makes ops impossible.

### 2.1 Health checks (`@nestjs/terminus` equivalent)

- **Why critical**: Kubernetes / Docker / load balancers all use
  `/health/live` and `/health/ready` endpoints for readiness
  probes and rolling deploys. Without them, K8s can't auto-restart
  unhealthy pods, and AWS ALB can't tell a healthy instance from a
  degraded one.
- **Proposed module**: `nexus/health`
- **Features**:
  - `LivenessCheck`, `ReadinessCheck`, `StartupCheck` interfaces
  - Built-in indicators: DB ping, Redis ping, memory, disk
  - `HealthCheckService.check([...])` aggregator
- **Usage**:

  ```ts
  @Get('/health/ready')
  async ready() {
    return this.health.check([
      this.db.pingCheck('database'),
      this.redis.pingCheck('cache'),
    ]);
  }
  ```

### 2.2 Rate limiting / throttling (`@nestjs/throttler` equivalent)

- **Why critical**: Without it, login endpoints, password-reset flows,
  payment APIs, and signup forms are wide open to credential stuffing
  and brute-force attacks.
- **Proposed module**: `nexus/throttle`
- **Features**:
  - `@Throttle({ default: { limit: 10, ttl: 60_000 } })` decorator
  - Per-route / per-controller / global limits
  - IP-based, user-based, API-key-based keys
  - Sliding-window algorithm (memory or Redis)

### 2.3 Security headers (`@nestjs/helmet` equivalent)

- **Why critical**: Without CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  every response is vulnerable to XSS, clickjacking, and MIME-sniffing
  attacks by default.
- **Proposed module**: middleware shipped in `nexus/core`
- **Features**:
  - `app.use('*', helmet())` one-liner
  - Sensible defaults (HSTS, X-Frame-Options=DENY, etc.)
  - Per-route overrides for APIs that need looser CSP

### 2.4 Configuration management (`@nestjs/config` equivalent)

- **Why critical**: Without it, you end up with `process.env.X`
  scattered through the codebase, with typos that only manifest at
  runtime. Production deploys fail silently.
- **Proposed module**: `nexus/config`
- **Features**:
  - `ConfigModule.forRoot({ schema: z.object({ DATABASE_URL: z.string().url() }) })`
  - JITI-style dynamic loading (`.env`, `.env.local`, etc.)
  - Multi-environment support (dev / prod / test)
  - Type-safe `config.get('DATABASE_URL')`

### 2.5 OpenAPI / Swagger (`@nestjs/swagger` equivalent)

- **Why critical**: API documentation, client SDK generation, and
  contract testing all depend on an OpenAPI artifact. Without it,
  frontend and backend teams drift on the contract.
- **Proposed module**: `nexus/openapi`
- **Features**:
  - `@ApiResponse()`, `@ApiProperty()`, `@ApiTags()` decorators
  - `/docs` UI (Scalar or Swagger UI)
  - Auto-derivation from Zod schemas
  - Client SDK generation via `openapi-typescript`

### 2.6 Request-scoped DI

- **Why critical**: Multi-tenant apps, per-request context (tenant, locale,
  request id), and audit logging all need a per-request scope.
  Without it, you fall back to global state (race conditions) or
  recreate the container per request (slow).
- **Proposed module**: extension to `nexus/core`
- **Features**:
  - `{ scope: 'request' }` provider option
  - AsyncLocalStorage-based propagation
  - Works with HTTP, WebSocket, and Cron contexts

### 2.7 GraphQL (`@nestjs/graphql` equivalent)

- **Why critical**: Many backend teams prefer GraphQL over REST for BFF
  patterns, mobile clients, and schema-first development.
- **Proposed module**: `nexus/graphql`
- **Features**:
  - `@Resolver()`, `@Query()`, `@Mutation()` decorators
  - Code-first schema generation
  - DataLoader integration (N+1 prevention)
  - Federation support
- **Note**: Lower priority than the others — most teams still ship REST.

---

## 3. Tier 2 — Important (most production apps)

### 3.1 WebSockets (`@nestjs/websockets` equivalent)

- **Use cases**: chat, notifications, live dashboards, multiplayer
- **Proposed module**: `nexus/ws`
- **Features**:
  - `@WebSocketGateway()` decorator
  - `@SubscribeMessage()` for handlers
  - Room management
  - Built on `ws` (Node) or Workers WebSocket pair

### 3.2 Caching (`@nestjs/cache-manager` equivalent)

- **Use cases**: DB query caching, API response caching, session storage
- **Proposed module**: `nexus/cache`
- **Features**:
  - `@CacheKey()`, `@CacheTTL()`, `@CacheInterceptor()` decorators
  - In-memory adapter (LRU)
  - Redis adapter (multi-instance)
  - Tag-based invalidation

### 3.3 Server-Sent Events (SSE)

- **Use cases**: one-way streaming (AI chat responses, build progress,
  live logs)
- **Proposed module**: `nexus/sse` (small wrapper)
- **Features**:
  - `SseStream` return type from handlers
  - Backed by Hono's `c.stream()`
  - Reconnection with `Last-Event-ID`

### 3.4 Microservices (`@nestjs/microservices` equivalent)

- **Use cases**: distributed systems, service-to-service communication
- **Proposed module**: `nexus/microservice`
- **Features**:
  - TCP, Redis, NATS, Kafka transports
  - `@MessagePattern('user.created')` decorator
  - Hybrid app: HTTP + microservice in the same process
  - Request-response and event patterns

### 3.5 Email integration (`@nestjs/mailer` equivalent)

- **Use cases**: signup confirmation, password reset, transactional mail
- **Proposed module**: `nexus/mailer`
- **Features**:
  - `@InjectMailer()` decorator
  - Template engine (Rendu / Edge)
  - Adapters: nodemailer (SMTP), Resend, AWS SES, Postmark

### 3.6 File upload (`multer` integration)

- **Use cases**: avatars, attachments, image uploads, CSV imports
- **Proposed module**: `nexus/upload`
- **Features**:
  - `@UploadedFile()` decorator (typed)
  - File validation (size, MIME type)
  - Storage adapters: local disk, S3, Cloudflare R2
  - Streaming upload (don't buffer to disk)

### 3.7 Logging abstraction

- **Use cases**: structured logs, log levels, request context
- **Proposed module**: `nexus/logger`
- **Features**:
  - `Logger` class with levels (debug / info / warn / error / fatal)
  - Pino / Winston adapters
  - Request-scoped context (requestId, userId, tenantId)
  - Pretty-print in dev, JSON in prod

### 3.8 Database migration tooling

- **Use cases**: schema changes in prod, rollback, audit trail
- **Proposed module**: `nx migrate:generate`, `nx migrate:apply` CLI
- **Features**:
  - Generate from schema diff (Drizzle Kit integration)
  - Up / down migrations
  - Dry-run mode
  - CI integration (run before deploy)

### 3.9 CORS abstraction

- **Use cases**: SPA ↔ API cross-origin
- **Proposed module**: middleware in `nexus/core`
- **Features**:
  - `app.use('*', cors({ origin: ['http://localhost:3001'], credentials: true }))`
  - Per-route CORS overrides
  - Auto-config from `nx.config.ts`

---

## 4. Tier 3 — Nice-to-have

### 4.1 i18n (`nestjs-i18n` equivalent)

- **Use cases**: multi-language SaaS
- **Proposed module**: `nexus/i18n`

### 4.2 Feature flags

- **Use cases**: canary deploys, A/B tests, gradual rollouts
- **Proposed module**: `nexus/feature-flag`

### 4.3 OpenTelemetry / tracing

- **Use cases**: distributed system debugging
- **Proposed module**: `nexus/tracing`

### 4.4 Metrics (Prometheus)

- **Use cases**: SLO monitoring, alerting
- **Proposed module**: `nexus/metrics`

### 4.5 gRPC (`@nestjs/microservices` partial)

- **Use cases**: service-to-service high-perf RPC
- **Proposed module**: `nexus/grpc`

### 4.6 Circuit breakers / retry

- **Use cases**: external API resilience
- **Proposed module**: `nexus/resilience`

### 4.7 Multi-database

- **Use cases**: PostgreSQL + Elasticsearch in one project
- **Proposed module**: extension to `nexus/db`

---

## 5. Quick wins (small effort, big impact)

The following can be added in **< 1 day each** with outsized effect:

| Task | Effort | Impact |
|------|--------|--------|
| `helmet()` middleware | Very low (1-2 hours) | High |
| OpenAPI generator from Zod | Low | High |
| `ConfigService` with Zod validation | Medium | High |
| CORS abstraction | Low | Medium |
| DB health check | Low | High (K8s deploy) |
| Rate-limit decorator | Medium | High |
| Pino logger integration | Medium | High (production) |

`helmet()` + an OpenAPI-from-Zod generator are the **two highest-leverage
quick wins** available right now.

---

## 6. Recommended v0.3+ roadmap

### v0.3 — Production basics (the "deploy-ready" milestone)

1. **`nexus/health`** — K8s / monitoring prerequisite
2. **`nexus/config`** — env validation, security
3. **`nexus/throttle`** — API protection
4. **helmet + CORS middleware** — security baseline
5. **`nexus/logger`** — Pino / Winston integration
6. **DB migration tool** — Drizzle Kit integration

These six together get NexusJS to "production deploy-ready" for
the majority of CRUD backends.

### v0.4 — Real-time & API

7. `nexus/cache` — in-memory + Redis
2. `nexus/ws` — WebSockets
3. `nexus/sse` — SSE
4. `nexus/openapi` — Swagger UI
5. `nexus/upload` — file uploads
6. `nexus/mailer` — email
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
4. Multi-database support

---

## 7. Honest assessment

NexusJS v0.2 has a **solid foundation**:

- The MVC + DI + validation core is production-ready.
- The optional modules (auth, queue, schedule, events, session) are
  each well-scoped and properly separated.
- The CLI is genuinely better than NestJS's `nest g` for new projects.

What's missing is the **boring production scaffolding** — the 20
modules that NestJS accumulated over 7 years that everyone forgets
about until they hit production.

The good news: most of these are **additive**. A new `nexus/health`
package can ship without touching the core. The foundation supports
adding them one at a time.

The realistic path to "NestJS feature parity" is **~12-18 months
of steady work**, with **v0.3 production-basics being the most
urgent** milestone. After v0.3, NexusJS is a viable alternative for
most CRUD backends; the remaining gaps are mostly **specialized
infrastructure** (GraphQL, microservices, gRPC) that many teams don't
need.

---

## 8. See also

- [`../README.md`](../../README.md) — current status & roadmap
- [`../user-guide/`](../../user-guide/) — existing module guides
- [`../design/`](../../design/) — existing design docs (auth, queue, etc.)
- [NestJS documentation](https://docs.nestjs.com) — the comparison baseline
- [Bulletproof Node.js architecture](https://github.com/santiq/bulletproof-nodejs) —
  the production checklist this analysis derives from
