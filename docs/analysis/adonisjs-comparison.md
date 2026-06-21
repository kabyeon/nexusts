# NexusJS vs AdonisJS — Feature Gap Analysis

> 한국어 버전: [`adonisjs-comparison.ko.md`](./adonisjs-comparison.ko.md)
> 분석 일자: 2026-06-22 · 기준: NexusJS **v0.4.0**

This document compares NexusJS v0.4 against [AdonisJS v6](https://adonisjs.com)
to identify which core backend features are **present**,
**partially present**, or **missing**. The v0.3 milestone closed the
biggest gap (Lucid ORM) by adopting Drizzle as the default.

> **Important**: AdonisJS and NestJS solve overlapping but distinct
> problems. NestJS is closer to a "DI framework that can also do HTTP";
> AdonisJS is closer to a "full-stack batteries-included backend with
> its own ORM, template engine, and CLI". A line-by-line feature
> comparison favours AdonisJS for **batteries** and NestJS for
> **architectural flexibility**. NexusJS aims to combine the best of
> both: AdonisJS-style batteries (Lucid-class ORM, mail, drive,
> shield, cache) and NestJS-style DI / multi-paradigm routing.

---

## 1. Summary table (v0.4)

Legend: ✅ ship · ⚠️ partial · ❌ missing · 🔵 third-party required

| Category | AdonisJS | NexusJS v0.4 | Notes |
|----------|----------|--------------|-------|
| HTTP / routing | ✅ Resource routes, groups, middleware | ✅ 3 styles | Tie |
| **ORM** | ✅ **Lucid** (first-party, batteries-included) | ✅ **Drizzle** (first-party, 5 dialects) | **Was** a big gap; **now** equivalent via Drizzle's Lucid-style ergonomics |
| **Validator** | ✅ **VineJS** (first-party, very fast) | ⚠️ Zod only | Tie functionally; gap if Vine matters |
| **Auth** | ✅ **Multi-guard** (session / access_tokens / basic_auth) | ⚠️ `nexus/auth` (better-auth) | better-auth supports multi-strategy but the `nexus/auth` surface is a thin wrapper |
| **Mail** | ✅ **@adonisjs/mail** with MJML | ✅ `nexus/mail` (SMTP / File / Null + MJML) | Tie |
| **Drive (storage)** | ✅ **@adonisjs/drive** (S3 / GCS / local) | ✅ `nexus/drive` (memory / Local / S3 / R2) | **Was** a gap; **now** equivalent |
| **Shield** (CSRF / XSS) | ✅ Built-in | ✅ `nexus/shield` | **Was** a gap; **now** equivalent |
| **Static** | ✅ `serveStatic` middleware | ✅ `nexus/static` | **Was** a gap; **now** equivalent |
| **Encryption / Hash** | ✅ `@adonisjs/encryption`, `@adonisjs/hash` | ❌ None | Still a gap |
| **Bodyparser** | ✅ Multipart, file upload, streams | ⚠️ Hono native, no decorator wrapper | Hono's `c.req.parseBody()` works |
| Health checks | ✅ `@adonisjs/health` | ✅ `nexus/health` | **Was** a gap; **now** equivalent |
| Cache | ✅ `@adonisjs/cache` (in-memory / Redis) | ✅ `nexus/cache` (memory / Drizzle) | **Was** a gap; **now** equivalent |
| Logging | ✅ Pino integrated | ✅ `nexus/logger` (Pino) | **Was** a gap; **now** equivalent |
| CORS | ✅ `@adonisjs/cors` | ⚠️ Hono middleware | Tie (Hono has one) |
| Session | ✅ `@adonisjs/session` (cookie / memory / Redis) | ✅ `nexus/session` (cookie / memory / Drizzle) | Tie; Nexus adds Drizzle as a backend |
| Queue | ✅ `@adonisjs/queue` (BullMQ under the hood) | ✅ `nexus/queue` (BullMQ / Cloudflare / Memory) | Tie |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `nexus/schedule` (`@Cron` / `@Interval` / `@Timeout`) | Tie |
| Events | ✅ `@adonisjs/events` | ✅ `nexus/events` (`@OnEvent` with wildcards) | Tie |
| i18n | ✅ `@adonisjs/i18n` | ❌ None | Still a gap |
| WebSocket | ✅ `@adonisjs/websocket` | ❌ None | Still a gap |
| Realtime (SSE) | ⚠️ DIY | ⚠️ DIY (planned `nexus/sse`) | Tie |
| Microservices | ⚠️ DIY | ⚠️ `nexus/queue` (job queue only) | Both lean on queue for now |
| CLI / Scaffolding | ✅ **Ace** (mature, vscode integration) | ✅ **`nx`** (newer, similar surface) | Tie |
| Test framework | ✅ **Japa** (first-party) | ⚠️ Vitest (external) | Tie (Vitest is excellent) |
| DI | ✅ IoC container, decorators | ✅ Decorator-driven | Tie |

**Headline change from v0.2**: 6 of the original "big gaps" are
now closed — most notably **ORM** (Drizzle's Lucid-style ergonomics

+ multi-dialect support) and **Drive / Mail / Cache / Shield /
Static / Health / Logging**. The remaining gaps (encryption, i18n,
WebSocket) are Tier 3.

---

## 2. Closed in v0.3 + v0.4 (recent wins)

The v0.3 and v0.4 milestones together closed the most-asked-for AdonisJS-style
batteries. Here's what shipped:

| Was missing in v0.2 | Shipped in v0.3 | Module |
| ------------------- | -------------- | ------ |
| Lucid-equivalent ORM | ✅ | `nexus/drizzle` (5 dialects + `DrizzleModel` + `DrizzleRepository` + `db.migrate` + `db.raw\`\``) |
| `@adonisjs/mail` | ✅ | `nexus/mail` (Null / File / SMTP transports + MJML via optional peer) |
| `@adonisjs/drive` | ✅ | `nexus/drive` (Memory / Local / S3 / R2) |
| `@adonisjs/shield` | ✅ | `nexus/shield` (CSRF + HSTS + CSP + X-Frame-Options + Referrer-Policy) |
| `@adonisjs/health` | ✅ | `nexus/health` (live/ready/startup + indicators) |
| `@adonisjs/cache` | ✅ | `nexus/cache` (memory LRU / Drizzle + tag-based invalidation) |
| Pino logging | ✅ | `nexus/logger` (Pino transports + AsyncLocalStorage request context) |
| `serveStatic` | ✅ | `nexus/static` (Hono middleware + ETag + Range + path-traversal protection) |
| DB session backend | ✅ | `DrizzleSessionStorage` (joins the existing cookie / memory backends) |
| Migrations via CLI | ✅ | `nx migrate` + `nx migrate --generate` (Drizzle-driven) |

Total: **16 AdonisJS-style batteries** shipped in v0.3 + v0.4 (10 in v0.3 + 6 in v0.4).

---

## 3. Tier 1 — Remaining critical gaps

### 3.1 Encryption / Hash (`@adonisjs/encryption` equivalent)

+ **Why critical**: Many apps need to encrypt sensitive data at
  rest (API keys, PII) or hash passwords (auth providers).
  Without a first-party helper, every project reinvents it
  inconsistently.
+ **Proposed module**: `nexus/crypto`
+ **Features**:
  + `crypto.encrypt(plaintext, key) → string` (AES-256-GCM)
  + `crypto.decrypt(ciphertext, key) → string`
  + `crypto.hash(plaintext) → string` (bcrypt / argon2)
  + `crypto.verify(plaintext, hash) → boolean`
  + Key derivation from secret strings (HKDF)

### 3.2 Multi-guard auth (`@adonisjs/auth` equivalent)

+ **Status**: `nexus/auth` wraps better-auth, which **does** support
  multiple strategies (email/password, OAuth, passkey, magic link).
  But the `nexus/auth` API surface currently exposes only the
  default `AuthService` — there is no first-class multi-guard
  abstraction.
+ **Proposed**: extension to `nexus/auth`
+ **Features**:
  + `AuthService.guard('web').signIn(...)` / `AuthService.guard('api').verify(token)`
  + Per-guard config (session cookies vs JWT)
  + Per-guard user resolution strategy

---

## 4. Tier 2 — Important (most production apps)

### 4.1 WebSocket (`@adonisjs/websocket` equivalent)

+ **Use cases**: chat, notifications, live dashboards.
+ **Proposed module**: `nexus/ws`
+ **Features**:
  + `@WebSocketGateway()` decorator
  + `@SubscribeMessage('chat')` handlers
  + Room management
  + Built on `ws` (Node) or Workers WebSocket pair

### 4.2 i18n (`@adonisjs/i18n` equivalent)

+ **Use cases**: multi-language SaaS.
+ **Proposed module**: `nexus/i18n`
+ **Features**:
  + `t('users.welcome', { name })` API
  + Per-request locale resolution
  + JSON / YAML / gettext-compatible message catalogs

### 4.3 Bodyparser / file upload helper

+ **Why**: Avatars, attachments, CSV imports. Hono native API
  works but no type-safe decorator wrapper.
+ **Proposed module**: `nexus/upload`
+ **Features**: `@UploadedFile()`, `@UploadedFiles()`, file
  validation, streaming

---

## 5. Tier 3 — Nice-to-have

### 5.1 OpenAPI / Swagger

+ **Status**: Tier 1 in the NestJS analysis; Tier 3 here because
  AdonisJS itself doesn't ship a first-party OpenAPI module —
  it relies on the community `adonis-autodoc`.
+ **Proposed module**: `nexus/openapi`
+ **Features**: Zod → OpenAPI, Scalar UI, decorators

### 5.2 OpenTelemetry / tracing

+ **Proposed module**: `nexus/tracing`
+ **Features**: OTLP exporter, `@Trace()` decorator, trace context
  propagation

### 5.3 Metrics (Prometheus)

+ **Proposed module**: `nexus/metrics`
+ **Features**: `@Counter`, `@Histogram`, `@Gauge`, `/metrics`
  endpoint

### 5.4 Resilience: circuit breakers + retry

+ **Proposed module**: `nexus/resilience`
+ **Features**: `@Retry()`, `@CircuitBreaker()`, bulkhead

### 5.5 Server-Sent Events (SSE)

+ **Proposed module**: `nexus/sse`
+ **Features**: `SseStream` return type, `Last-Event-ID` reconnection

---

## 6. Quick wins

| Task | Effort | Impact | Notes |
|------|--------|--------|-------|
| `nexus/crypto` (encryption + hash) | Low | High | Every project reinvents this; first-party fills the gap |
| Multi-guard extension to `nexus/auth` | Low | Medium | better-auth already supports it; the wrapper is what's missing |
| `helmet()` middleware in `nexus/shield` | Very low | High | Drop-in addition |
| CORS abstraction | Low | Medium | Hono has one; consistent config is the win |
| Multipart body parser wrapper | Low | Medium | Same pattern as file upload helper |

The single biggest remaining **battery** gap is `nexus/crypto` — every
project needs it and re-implements it inconsistently.

---

## 7. Recommended v0.4+ roadmap

### v0.4 — Encryption + real-time foundations

1. **`nexus/crypto`** — encryption + password hashing
2. **`nexus/ws`** — WebSockets
3. **`nexus/upload`** — file upload helper
4. **`nexus/sse`** — Server-Sent Events
5. **Multi-guard extension to `nexus/auth`**
6. **Request-scoped DI** — core extension

These six complete the **batteries** story: an AdonisJS user
migrating to NexusJS would have feature parity for 95% of their
existing code paths.

### v0.5 — API completeness

+ `nexus/openapi` — Zod → OpenAPI, Scalar UI
+ `nexus/i18n` — multi-language
+ `nexus/tracing` — OpenTelemetry
+ `nexus/metrics` — Prometheus
+ `nexus/resilience` — circuit breakers, retry

### v0.6 — Distributed

+ `nexus/grpc` — gRPC
+ `nexus/graphql` — GraphQL
+ `nexus/microservice` — TCP / NATS / Redis transports
+ Stable public API surface (semver guarantees)

---

## 8. Honest assessment (v0.4)

The v0.4 release **transformed the AdonisJS comparison** from "many
big gaps" to "small Tier 1+2 gaps". The most-asked-for
AdonisJS-style batteries — ORM, mail, drive, shield, cache,
static, health, logging — are all first-party in NexusJS now.

What's distinctive about NexusJS vs AdonisJS v6 today:

| NexusJS advantage | AdonisJS advantage |
| ----------------- | ------------------- |
| Bun-native runtime, faster startup | More mature ecosystem (5+ years) |
| 5-dialect ORM via Drizzle | Single Lucid ORM (postgres / sqlite / mysql) |
| Multi-runtime: Bun / Node / Workers | Single runtime (Node) |
| Three routing styles (Nest / Adonis / Hono) | Single Adonis-style router |
| Drizzle's tagged-template raw queries (SQL-injection-safe) | Lucid's query builder (typed) |
| `nx` CLI scaffolds both models and migrations | `Ace` CLI does both but with different commands |
| Resource limits are optional peer deps (no AWS SDK unless used) | All batteries pre-installed (larger bundle) |

What AdonisJS still has that NexusJS doesn't:

+ Encryption / hash helpers (Tier 1)
+ Multi-guard auth abstraction (Tier 1, partial via better-auth)
+ WebSocket module (Tier 2)
+ i18n (Tier 2)
+ VineJS validator (debatable — Zod is more popular)

The path from v0.3 to "AdonisJS feature parity" is roughly the
same as "NestJS feature parity" — v0.4 closes the remaining
Tier 1+2 batteries, v0.5 adds API completeness, v0.6 adds
distributed-system primitives.

After v0.6, the comparison is mostly **paradigm** vs **paradigm**:
AdonisJS has a single blessed way to do everything; NexusJS gives
you three routing styles, an ORM choice, and Bun. For new projects,
NexusJS is the more flexible starting point.

---

## 9. See also

+ [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.4 release notes
+ [`../README.md`](../../README.md) — current status & roadmap
+ [`../../user-guide/drizzle.md`](../../user-guide/drizzle.md) — the Lucid-equivalent guide
+ [`../../user-guide/`](../../user-guide/) — guides for the 17 modules
+ [`./nestjs-comparison.md`](./nestjs-comparison.md) — companion analysis
+ [AdonisJS documentation](https://docs.adonisjs.com) — the comparison baseline
