# NexusJS vs AdonisJS — Feature Gap Analysis

> 한국어 버전: [`adonisjs-comparison.ko.md`](./adonisjs-comparison.ko.md)
> 분석 일자: 2026-06-20 · 기준: NexusJS v0.2.0

This document compares NexusJS v0.2 against [AdonisJS v6](https://adonisjs.com)
to identify which core backend features are **present**,
**partially present**, or **missing**. The companion analysis
[NestJS comparison](./nestjs-comparison.md) is structured
identically — this one highlights where the two frameworks
**diverge**.

> **Important**: AdonisJS and NestJS solve overlapping but distinct
> problems. NestJS is closer to a "DI framework that can also do HTTP";
> AdonisJS is closer to a "full-stack batteries-included backend with
> its own ORM, template engine, and CLI". A line-by-line feature
> comparison favours AdonisJS for **batteries** and NestJS for
> **architectural flexibility**.

---

## 1. Summary table

| Category | AdonisJS | NexusJS v0.2 | Notes |
|----------|----------|--------------|-------|
| HTTP / routing | ✅ Resource routes, groups, middleware | ✅ 3 styles | Tie |
| **ORM** | ✅ **Lucid** (first-party, batteries-included) | ⚠️ Drizzle optional | **Big gap** |
| **Validator** | ✅ **VineJS** (first-party, very fast) | ⚠️ Zod only | Tie functionally; gap if Vine matters |
| **Auth** | ✅ **Multi-guard** (session / access_tokens / basic_auth) | ⚠️ better-auth (single system) | Gap |
| **Mail** | ✅ **@adonisjs/mail** with MJML | ❌ None | **Big gap** |
| **Drive (storage)** | ✅ **@adonisjs/drive** (S3 / GCS / local) | ❌ None | **Big gap** |
| **Shield** (CSRF / XSS) | ✅ Built-in | ❌ None | Gap |
| **Static** | ✅ `serveStatic` middleware | ❌ None (use Hono middleware) | Small gap |
| **Encryption / Hash** | ✅ `@adonisjs/encryption`, `@adonisjs/hash` | ❌ None | Gap |
| **Bodyparser** | ✅ Multipart, file upload, streams | ❌ None | Gap |
| Health checks | ✅ `@adonisjs/health` | ❌ None | Gap |
| Cache | ✅ `@adonisjs/cache` (in-memory / Redis) | ❌ None | Gap |
| Logging | ✅ Pino integrated | ❌ `console.log` only | Gap |
| CORS | ✅ `@adonisjs/cors` | ❌ Use Hono middleware | Tie (Hono has one) |
| Session | ✅ `@adonisjs/session` (cookie / memory / Redis) | ✅ Cookie / memory | Tie |
| Queue | ✅ `@adonisjs/queue` (BullMQ under the hood) | ✅ BullMQ / Cloudflare / Memory | Tie |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `@Cron` / `@Interval` / `@Timeout` | Tie |
| Events | ✅ `@adonisjs/events` | ✅ `@OnEvent` with wildcards | Tie |
| i18n | ✅ `@adonisjs/i18n` | ❌ None | Gap |
| WebSocket | ✅ `@adonisjs/websocket` | ❌ None | Gap |
| Realtime (SSE) | ⚠️ DIY | ❌ None | Tie (both DIY) |
| Microservices | ⚠️ DIY | ❌ None | Tie (both DIY) |
| CLI / Scaffolding | ✅ **Ace** (mature, vscode integration) | ✅ **nx** (newer, similar surface) | Tie |
| Test framework | ✅ **Japa** (first-party) | ⚠️ Vitest (external) | Tie (Vitest is excellent) |
| DI | ✅ IoC container, decorators | ✅ Decorator-driven | Tie |

**Headline gap**: AdonisJS has **far more batteries-included first-party
packages** than NexusJS. Most are smaller, well-scoped modules that
NexusJS could add incrementally.

---

## 2. Tier 1 — Critical for production

These are the **first** features to add. Each one addresses a
common production need that NestJS/AdonisJS users take for granted.

### 2.1 Health checks (`@adonisjs/health` equivalent)

- **Why critical**: Same as the NestJS analysis — K8s readiness probes,
  load balancer health checks, ops dashboards.
- **Proposed module**: `nexus/health` (same module as in the
  NestJS analysis — both gaps are the same gap)

### 2.2 Cache (`@adonisjs/cache` equivalent)

- **Why critical**: Every CRUD backend benefits from caching expensive
  queries or responses. Without it, every DB hit goes all the way
  down.
- **Proposed module**: `nexus/cache`
- **Features**:
  - `@CacheKey()`, `@CacheTTL()`, `@CacheInterceptor()` decorators
  - In-memory adapter (LRU)
  - Redis adapter (multi-instance)
  - Tag-based invalidation
- **Usage**:

  ```ts
  @CacheTTL(60_000)
  @Get('/users/:id')
  async show(@Param('id') id: string) {
    return this.users.find(id);
  }
  ```

### 2.3 Configuration management (`@adonisjs/config` equivalent)

- **Why critical**: `process.env.X` scattered through the codebase
  causes silent production failures. AdonisJS's `@adonisjs/config` uses
  TypeScript files with dotenv-like loading; we can use Zod for
  validation.
- **Proposed module**: `nexus/config` (also flagged in NestJS
  analysis)

### 2.4 Rate limiting / throttling

- **Why critical**: Same as NestJS — API protection from abuse.
- **Proposed module**: `nexus/throttle`

### 2.5 Logging (Pino integration)

- **Why critical**: `console.log` is unusable in production. AdonisJS
  ships Pino integrated by default; we should too.
- **Proposed module**: `nexus/logger`
- **Features**:
  - `Logger` class with levels (debug / info / warn / error / fatal)
  - Pino adapter (default in production)
  - Pretty-print adapter (development)
  - Request-scoped context (requestId, userId)
- **Usage**:

  ```ts
  constructor(@Inject(Logger.TOKEN) private logger: Logger) {}

  @Get('/users/:id')
  async show(@Param('id') id: string) {
    this.logger.info({ userId: id }, 'fetching user');
  }
  ```

### 2.6 CORS abstraction

- **Why critical**: SPA ↔ API cross-origin. AdonisJS ships
  `@adonisjs/cors`; we delegate to Hono's middleware (works, but
  no first-party config).
- **Proposed module**: middleware in `nexus/core`
- **Features**:
  - `app.use('*', cors({ origin: [...], credentials: true }))`
  - Auto-config from `nx.config.ts`
  - Per-route overrides

---

## 3. Tier 2 — Important (AdonisJS-strong areas)

These are areas where **AdonisJS is particularly strong** — features
that make AdonisJS a "batteries-included" framework. NexusJS v0.2 has
a weaker story here.

### 3.1 Drive — storage abstraction (`@adonisjs/drive` equivalent)

- **Why important**: User-uploaded files (avatars, attachments, CSV
  imports) need a uniform API across local disk, S3, GCS, R2. Without
  this, every controller ends up calling the AWS SDK directly.
- **Proposed module**: `nexus/drive`
- **Features**:
  - `DriveService.put(path, content)`, `.get(path)`, `.delete(path)`
  - Storage adapters: `local`, `s3`, `gcs`, `r2`
  - Presigned URL generation
  - Streaming uploads / downloads
- **Usage**:

  ```ts
  @Post('/avatar')
  async upload(@UploadedFile('avatar') file: File) {
    await this.drive.put(`avatars/${userId}.png`, file.stream());
  }
  ```

### 3.2 Mail (`@adonisjs/mail` equivalent)

- **Why important**: Signup confirmation, password reset, transactional
  mail, marketing emails — every SaaS needs it.
- **Proposed module**: `nexus/mail`
- **Features**:
  - `@InjectMailer()` decorator
  - Template engine integration (Edge / Rendu)
  - MJML support (responsive HTML emails without table-layout pain)
  - Adapters: nodemailer (SMTP), Resend, AWS SES, Postmark
- **Usage**:

  ```ts
  await this.mail.send('welcome', { to: user.email, data: { name } });
  ```

### 3.3 Shield — CSRF / XSS (`@adonisjs/shield` equivalent)

- **Why important**: Security primitives should be on by default, not
  opt-in. AdonisJS ships `shield` that:
  - Blocks cross-origin form posts (CSRF)
  - Sets secure headers (CSP, X-Frame-Options, X-Content-Type-Options)
  - Disables `dangerouslySetInnerHTML`-style XSS vectors
- **Proposed module**: `nexus/shield`
- **Features**:
  - `app.use('*', shield())` middleware
  - CSRF token generation + validation
  - Secure defaults with override knobs
  - Per-route opt-out for pure JSON APIs

### 3.4 Static file serving (`@adonisjs/static` equivalent)

- **Why important**: When using AdonisJS for traditional web apps
  (serving React/Vue SPAs, file downloads, image hosting), `serveStatic`
  is essential. Without it, controllers handle `/favicon.ico` and
  `/robots.txt` by hand.
- **Proposed module**: `nexus/static` (small)
- **Features**:
  - `app.use('/public/*', serveStatic({ root: './public' }))`
  - Cache-Control headers
  - ETag support
  - Range requests (for video / large files)

### 3.5 Encryption / Hash (`@adonisjs/encryption`, `@adonisjs/hash`)

- **Why important**: Application-level crypto helpers — encrypting PII at
  rest, hashing API keys, generating secure tokens. Without these,
  every service rolls its own crypto (and gets it wrong).
- **Proposed module**: `nexus/crypto`
- **Features**:
  - `crypto.encrypt(plaintext, key?)` / `crypto.decrypt(ciphertext, key?)`
  - `hash.make(value)` / `hash.verify(value, hashed)` (argon2 / bcrypt)
  - `random.token(length)` for secure random strings
  - Configurable algorithm + key rotation

### 3.6 Bodyparser / multipart (`@adonisjs/bodyparser` equivalent)

- **Why important**: Hono has a basic body parser, but multipart /
  file upload / streaming is not built in. AdonisJS ships a robust
  bodyparser that handles multipart natively.
- **Proposed module**: `nexus/bodyparser`
- **Features**:
  - JSON, form-urlencoded, multipart/form-data
  - File upload streaming (no disk buffering)
  - Configurable size limits
  - Type-safe `@UploadedFile()` decorator

### 3.7 Multi-guard auth

- **Why important**: AdonisJS's auth supports **multiple guards in
  one project** — e.g. admins use session cookies, mobile clients use
  access tokens, internal services use basic auth. NexusJS's
  better-auth integration is **one auth system per project**.
- **Proposed module**: extension to `nexus/auth`
- **Features**:
  - Multiple `AuthGuard` instances (session, token, basic)
  - Per-route `@UseGuard('token')` selection
  - Shared user table; different session strategies

### 3.8 Lucid ORM equivalent — first-party ORM integration

- **Why important**: This is the **single biggest gap**. Lucid is so
  central to AdonisJS that "AdonisJS without Lucid" feels like a
  different framework. We have Drizzle as an option, but no
  first-party ORM with migrations / seeders / factories.
- **Proposed module**: `nexus/lucid`
- **Features**:
  - `@column()` / `@hasMany()` decorators on models
  - `Model.query()`, `.find()`, `.create()` static API
  - Migration generation from model diffs
  - Seeders + factory functions (like `@faker-js/faker` integration)
  - Built-in pagination (`Model.query().paginate(1, 20)`)
- **Decision**: this is a **multi-month project**. Either:
  1. Wrap Drizzle in a Lucid-like decorator API (`nexus/lucid`).
  2. Recommend Drizzle as the canonical ORM and provide better
     `nx make:model` / `nx migrate` / `nx seed` CLI commands.

---

## 4. Tier 3 — Nice-to-have

### 4.1 i18n (`@adonisjs/i18n` equivalent)

- **Use cases**: multi-language SaaS
- **Proposed module**: `nexus/i18n`
- **Features**: JSON / YAML locale files, `@t()` decorator, ICU message
  format

### 4.2 WebSocket (`@adonisjs/websocket` equivalent)

- **Use cases**: chat, notifications, live dashboards
- **Proposed module**: `nexus/ws`
- **Features**: `@Socket()` decorator, channels, presence

### 4.3 Server-Sent Events

- **Use cases**: AI streaming, build progress, live logs
- **Proposed module**: `nexus/sse` (small)

### 4.4 Lucid-style seeders + factories (subset of Tier 3.8)

- **Use cases**: dev / test data generation
- **Proposed module**: part of `nexus/lucid`
- **Features**:
  - `factory.define(User, () => ({ ... }))` with `@faker-js/faker` integration
  - `db.seed()` runs all seeders

### 4.5 Vine validator (alternative to Zod)

- **Use cases**: teams that prefer Vine's compile-time validation
- **Proposed module**: `nexus/vine` (adapter)
- **Note**: Zod is perfectly fine for most apps. Vine is a perf win
  on hot paths. Low priority.

### 4.6 Ace CLI parity (`@adonisjs/ace` equivalent)

- **Use cases**: project-local CLI commands (custom seeders,
  reports, migrations)
- **Proposed module**: `nexus/ace` (or just `nx ace`)
- **Features**: `nx make:command Foo`, decorators like `@args.string`,
  `@flags.boolean`
- **Note**: our current `nx` is for **scaffolding**; an `ace`-style
  project-local CLI is a different tool. We have `nx make:foo` but not
  `nx mydomain:dothething`.

---

## 5. Quick wins (small effort, big impact)

| Task | Effort | Impact |
|------|--------|--------|
| `helmet()` + secure headers middleware | Low (hours) | High |
| Pino logger integration | Low | High (production) |
| CORS config from `nx.config.ts` | Low | Medium |
| Health check endpoint | Low | High (K8s) |
| Encryption helpers (`crypto.encrypt`) | Low | Medium |
| `crypto.random.token()` | Very low | Medium |
| Bodyparser multipart | Medium | High |
| Static file serving | Low | Medium |

**The two highest-leverage quick wins**:

1. **`@adonisjs/shield` equivalent** — security defaults that just work.
2. **Pino logger** — observability from day 1.

---

## 6. Recommended v0.3+ roadmap (AdonisJS-shaped)

AdonisJS's strengths suggest a different prioritization than the
NestJS one. The following merges both analyses:

### v0.3 — Production basics (NestJS-shaped, must-have)

1. `nexus/health` — K8s / monitoring
2. `nexus/config` — env validation
3. `nexus/throttle` — rate limiting
4. `nexus/logger` — Pino integration
5. **Pino / helmet / CORS middleware bundled**
6. `nx migrate` — Drizzle Kit integration

### v0.4 — AdonisJS batteries (the "indie hacker" milestone)

7. `nexus/shield` — CSRF / XSS / secure headers on by default
2. `nexus/drive` — storage abstraction (local / S3 / R2)
3. `nexus/mail` — email with MJML
4. `nexus/bodyparser` — multipart / file upload
5. `nexus/static` — serveStatic middleware
6. `nexus/crypto` — encryption + hash helpers
7. **Multi-guard auth** extension

### v0.5 — First-party ORM (the "batteries-included" milestone)

14. `nexus/lucid` — Lucid-style ORM API over Drizzle (or Prisma)
    - `@column()` decorators
    - Migration generator
    - Seeder + factory support
    - Pagination helpers

### v0.6 — Distributed

15. `nexus/cache` — in-memory + Redis
2. `nexus/redis` — first-party Redis client wrapper
3. `nexus/microservice` — TCP / Redis / NATS
4. `nexus/i18n`

### v0.7 — Realtime

19. `nexus/ws` — WebSockets
2. `nexus/sse` — SSE
3. `nexus/tracing` — OpenTelemetry

### v0.8 — v1.0 hardening

22. `nexus/feature-flag`
2. `nexus/metrics` — Prometheus
3. Stable public API surface (semver)

---

## 7. Honest assessment

The two comparisons paint **different pictures**:

### NestJS comparison headline

> "NexusJS has the right architecture but is missing 20 small modules
> for production deploy."

### AdonisJS comparison headline

> "NexusJS has the right architecture but is missing the **biggest
> batteries**: a first-party ORM (Lucid), file storage (Drive),
> email (Mail), and security defaults (Shield)."

The AdonisJS comparison is **harder to close**. Lucid-equivalent work
alone is a **6-month project** if done from scratch, or 2-3 months
if we wrap Drizzle in a Lucid-like decorator API.

**The two gap lists overlap significantly** on Tier 1 (health,
config, throttle, logger, helmet). Those are easy wins regardless of
which comparison you prioritize.

The Tier 2 / v0.4 priorities **diverge**:

- NestJS-focused: WebSockets, GraphQL, microservices
- AdonisJS-focused: Drive, Mail, Shield, bodyparser, Lucid

A pragmatic compromise: **ship the AdonisJS Tier 2 set first**
because it's smaller in scope and covers more use cases per module
(Drive + Mail + Shield together are smaller than GraphQL alone).

---

## 8. What to skip (NestJS-first but not AdonisJS-first)

Some features that **NestJS has but AdonisJS doesn't** are still
important. These are *not* in the AdonisJS-shaping priority list:

- **GraphQL** — AdonisJS doesn't ship this either. Defer.
- **Microservices transports** — AdonisJS doesn't ship this either.
  Defer.
- **gRPC** — Defer.
- **Hybrid HTTP + microservice app** — Defer.

AdonisJS itself doesn't compete on these. They're outside its
target audience.

---

## 9. Strategic comparison

| Audience | Best fit today | Becomes competitive when |
|----------|----------------|---------------------------|
| **CRUD / SaaS backend** | AdonisJS (batteries) | NexusJS ships `nexus/lucid` + `nexus/mail` + `nexus/drive` |
| **REST API for SPA / mobile** | Tie | NexusJS ships `nexus/openapi` + `nexus/throttle` |
| **Microservices / distributed** | NestJS | NexusJS ships `nexus/microservice` |
| **GraphQL BFF** | NestJS | NexusJS ships `nexus/graphql` |
| **Edge / Workers-native** | Hono / Fresh | **Already NexusJS's strength** |
| **Bun-native / Drizzle** | Elysia | **Already NexusJS's strength** |

The opportunity for NexusJS is to become **the obvious choice for
the "Bun-native + batteries-included" niche** that AdonisJS occupies
in the Node ecosystem. That requires Tier 2 of the AdonisJS list
(Lucid, Drive, Mail, Shield).

---

## 10. See also

- [`nestjs-comparison.md`](./nestjs-comparison.md) — the companion
  analysis (sister doc, same structure)
- [`../README.md`](../../README.md) — current status & roadmap
- [`../user-guide/`](../../user-guide/) — existing module guides
- [`../design/`](../../design/) — existing design docs
- [AdonisJS documentation](https://docs.adonisjs.com) — comparison baseline
- [@adonisjs/lucid](https://lucid.adonisjs.com) — the ORM to learn from
- [FlyDrive](https://github.com/Slynova-Org/fly-drive) — the storage abstraction AdonisJS wraps
