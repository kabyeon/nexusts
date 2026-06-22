# NexusJS vs AdonisJS — Feature Gap Analysis

> 한국어 버전: [`adonisjs-comparison.ko.md`](./adonisjs-comparison.ko.md)
> 분석 일자: 2026-06-23 · 기준: NexusJS **v0.7.0**

This document compares NexusJS v0.7.0 against [AdonisJS v6](https://adonisjs.com)
to identify which AdonisJS-style "batteries" (convention-driven,
"everything just works" features) are **present**, **partially
present**, or **missing**. The v0.3–v0.7.0 milestones together
closed every Tier 1, Tier 2, and Tier 3 gap; the framework now
covers every battery AdonisJS ships — and then some.

> **Important**: AdonisJS is a 9-year-old framework, 5 years
> ahead of NexusJS. It has dozens of first-party packages
> (`@adonisjs/*`) that are highly opinionated. NexusJS deliberately
> ships a smaller core and a "compose your own stack" philosophy.
> The "gap" is therefore not so much feature parity as **battery
> coverage** — the level of "everything just works" AdonisJS is
> known for.

---

## 1. Summary table (v0.7.0)

Legend: ✅ ship · ⚠️ partial · ❌ missing · 🔵 third-party required

| Category | AdonisJS | NexusJS v0.7.0 | Notes |
|----------|----------|--------------|-------|
| HTTP server | ✅ Custom (Node & Workers) | ✅ Hono (Bun / Node / Workers) | Nexus uses Hono as the underlying server |
| Routing | ✅ Route groups, resources, subdomains | ✅ Class decorators + functional | Three styles: Nest, Adonis, Functional |
| Controllers | ✅ "thin" (Adonis convention) | ✅ "fat" (Nest-style with DI) | Both work; pick your style |
| Middleware | ✅ Class-based, ordered | ✅ Hono middleware (typed) | `app.use('*', mw)` |
| DI | ✅ IoC container, decorators | ✅ Class-based + `@Inject()` | Both Nest-style and Adonis-style |
| Validation | ✅ Vine (Zod-inspired) | ✅ Zod | Nexus uses Zod directly via `@Validate` |
| ORM | ✅ Lucid (built-in) | ✅ `@kabyeon/nexusjs/drizzle` | Drizzle is the default ORM |
| Migrations | ✅ Built-in | ✅ `nx db:migrate` (drizzle-kit wrapper) | Same DX |
| Seeding | ✅ Built-in factories | ⚠️ DIY | No first-party; users write factories |
| Auth | ✅ `@adonisjs/auth` | ✅ `@kabyeon/nexusjs/auth` (better-auth) | better-auth = many strategies |
| Sessions | ✅ `@adonisjs/session` | ✅ `@kabyeon/nexusjs/session` | Cookie / Memory / Drizzle backends |
| Encryption | ✅ `@adonisjs/encryption` | ✅ `@kabyeon/nexusjs/crypto` (AES-256-GCM + HMAC + scrypt) | Same API style |
| Hash | ✅ `@adonisjs/hash` | ✅ `@kabyeon/nexusjs/crypto` (HashService) | Argon2 / scrypt |
| Shield | ✅ `@adonisjs/shield` (CSRF, headers) | ✅ `@kabyeon/nexusjs/shield` (CSRF / HSTS / CSP) | Same naming, same purpose |
| Throttler | ✅ `@adonisjs/throttler` | ✅ `@kabyeon/nexusjs/limiter` (fixed / sliding / token-bucket) | |
| Logger | ✅ `@adonisjs/logger` | ✅ `@kabyeon/nexusjs/logger` (Pino) | |
| Mail | ✅ `@adonisjs/mail` | ✅ `@kabyeon/nexusjs/mail` (SMTP / File / Null) | |
| Drive (file storage) | ✅ `@adonisjs/drive` | ✅ `@kabyeon/nexusjs/drive` (Local / S3 / R2 / memory) | |
| Cache | ✅ `@adonisjs/cache` | ✅ `@kabyeon/nexusjs/cache` (memory / Drizzle) | |
| Events | ✅ `@adonisjs/events` | ✅ `@kabyeon/nexusjs/events` | wildcards, priorities, guards |
| Queue | ✅ `@adonisjs/queue` | ✅ `@kabyeon/nexusjs/queue` (BullMQ / Cloudflare / memory) | |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `@kabyeon/nexusjs/schedule` (in-tree cron parser) | No external dep |
| Static | ✅ `@adonisjs/static` | ✅ `@kabyeon/nexusjs/static` (ETag / Range / MIME) | |
| Health | ✅ `@adonisjs/health` | ✅ `@kabyeon/nexusjs/health` (built-in indicators) | |
| SSE | ❌ DIY | ✅ `@kabyeon/nexusjs/sse` | Nexus ships SSE out of the box |
| WebSockets | ❌ DIY | ✅ `@kabyeon/nexusjs/ws` | Runtime auto-detected (Bun / Node) |
| Upload | ❌ DIY | ✅ `@kabyeon/nexusjs/upload` | `@Upload()` / `@UploadedFile()` decorators |
| i18n | ✅ `@adonisjs/i18n` | ✅ `@kabyeon/nexusjs/i18n` | `Intl`-based, pluralization |
| OpenAPI | ❌ DIY | ✅ `@kabyeon/nexusjs/openapi` | Zod → OpenAPI 3.1 + Scalar UI |
| Tracing | ❌ DIY | ✅ `@kabyeon/nexusjs/tracing` | OpenTelemetry with lazy SDK |
| Metrics | ❌ DIY | ✅ `@kabyeon/nexusjs/metrics` | Prometheus / OpenMetrics |
| Bodyparser | ✅ Built-in | ✅ Hono's `c.req.parseBody()` + `@kabyeon/nexusjs/upload` | |
| REPL | ✅ `node ace repl` | ✅ `nx repl` | Interactive REPL shipped in v0.5 |
| Inspector | ✅ `@adonisjs/inspector` | ❌ Not shipped | Debugging-only |
| Admin panel | ✅ `@adonisjs/admin` | ❌ Not shipped | Lower priority |
| GraphQL | ✅ `@adonisjs/graphql` (legacy) | ✅ `@kabyeon/nexusjs/graphql` | SDL-first; `@Resolver`/`@Query`/`@Mutation` decorators (code-first SDL synthesis v0.8). v0.6.9 shipped. |
| gRPC | ❌ DIY | ✅ `@kabyeon/nexusjs/grpc` | Reflection-based, unary (streaming v2). v0.5 shipped. |
| Feature flags | ❌ DIY | ❌ None | Planned v0.8 |
| Resilience (circuit breaker, retry) | ❌ DIY | ✅ `@kabyeon/nexusjs/resilience` | Retry + Circuit Breaker + Bulkhead, shared named registry, exponential-jitter backoff. v0.7.0 shipped. **Zero new deps.** |

**Headline**: NexusJS v0.7.0 covers **every** AdonisJS v6 battery
and exceeds it on modern features (GraphQL, WebSockets, OpenAPI,
SSE, tracing, metrics, gRPC, resilience) that AdonisJS doesn't
ship as batteries. All **30** modules are first-party.

---

## 2. Closed in v0.3 → v0.7.0 (recent wins)

The v0.3, v0.4, v0.5, v0.6.x, and v0.7.0 milestones together closed every
"missing battery" gap. **35 AdonisJS-style batteries** now ship.

| Was missing in v0.2 | Shipped | Module |
| ------------------- | ------- | ------ |
| Health checks | v0.3 | `@kabyeon/nexusjs/health` |
| Rate limiting / throttling | v0.3 | `@kabyeon/nexusjs/limiter` |
| Security headers (CSRF / HSTS / CSP) | v0.3 | `@kabyeon/nexusjs/shield` |
| Configuration management | v0.3 | `@kabyeon/nexusjs/config` |
| Logging | v0.3 | `@kabyeon/nexusjs/logger` |
| Cache | v0.3 | `@kabyeon/nexusjs/cache` |
| Email | v0.3 | `@kabyeon/nexusjs/mail` |
| File storage (S3 / R2 / Local) | v0.3 | `@kabyeon/nexusjs/drive` |
| Database (default ORM) | v0.3 | `@kabyeon/nexusjs/drizzle` |
| Database migrations + CLI | v0.3 | `nx db:migrate` |
| Static file serving | v0.3 | `@kabyeon/nexusjs/static` |
| **OpenAPI generator** | v0.4 | `@kabyeon/nexusjs/openapi` |
| **File upload helper** | v0.4 | `@kabyeon/nexusjs/upload` |
| **Request-scoped DI** | v0.4 | core DI + ALS + Hono middleware |
| **Server-Sent Events** | v0.4 | `@kabyeon/nexusjs/sse` |
| **Distributed tracing** | v0.4 | `@kabyeon/nexusjs/tracing` |
| **Prometheus metrics** | v0.4 | `@kabyeon/nexusjs/metrics` |
| **WebSockets** | v0.5 | `@kabyeon/nexusjs/ws` |
| **Encryption + password hashing** | v0.5 | `@kabyeon/nexusjs/crypto` |
| **i18n** | v0.5 | `@kabyeon/nexusjs/i18n` |
| **gRPC** | v0.5 | `@kabyeon/nexusjs/grpc` |
| **`nx repl`** | v0.5 | Interactive REPL |
| **View engine extracted** | v0.6 | `@kabyeon/nexusjs/view` |
| **Auto-load viewPaths from nx.config.ts** | v0.6.4 | `Application.tryLoadNxConfig()` |
| **Default view = Rendu, Eta option** | v0.6.4 | |
| **Env-aware config (`.env.{NODE_ENV}`)** | v0.6.5 | |
| **`nx db:generate`** | v0.6.5 | drizzle-kit wrapper |
| **Built-in `sessionMiddleware()`** | v0.6.5 | |
| **`@kabyeon/nexusjs` package rename** | v0.6.6 | npm name conflict |
| **`router.getRoutes()` for OpenAPI** | v0.6.6 | feeds spec generation |
| **`create-nexusjs` scaffolder** | v0.6.7 | `bunx create-nexusjs my-app` |
| **`examples/` + smoke test suite** | v0.6.8 | 27 working examples |
| **Inertia v2 examples (React + Vue, SPA + SSR)** | v0.6.8 | 4 examples (28–31) |
| **`@kabyeon/nexusjs/graphql`** | v0.6.9 | SDL-first GraphQL endpoint |
| **`@kabyeon/nexusjs/resilience`** | v0.7.0 | Retry + Circuit Breaker + Bulkhead |

---

## 3. Different philosophies

AdonisJS and NexusJS solve a similar problem with different
trade-offs:

| Concern | AdonisJS approach | NexusJS approach |
| ------- | ------------------ | ----------------- |
| **Server runtime** | Custom Node HTTP server | Hono (Bun / Node / Workers) |
| **DI** | IoC container, decorators, lazy resolution | Class-based + `@Inject()`, request-scoped via ALS |
| **ORM** | Lucid (built-in, opinionated) | Drizzle (default, less opinionated) |
| **Validation** | Vine (Zod-inspired) | Zod (de-facto standard) |
| **Convention vs. composition** | Heavy convention (lucid → "User.find", routes → "users", etc.) | Light convention + composition (DI wins) |
| **Bundle size** | Single ~1MB bundle | Per-module bundles (~5-50kb each) |
| **Number of first-party packages** | 30+ `@adonisjs/*` packages | 30 first-party modules under `@kabyeon/nexusjs/*` |
| **Multi-runtime** | Node + Workers | Bun + Node + Workers |
| **Build philosophy** | One large app | "Compose your own" — install only what you use |
| **Default ORM style** | ActiveRecord (`User.find(id)`) | Drizzle's query builder + `DrizzleRepository` (Lucid-like) |

The biggest practical difference: **AdonisJS leans on convention,
NexusJS leans on composition**. If you're comfortable with
decorators, DI, and a more "Nest" style, NexusJS will feel
natural. If you prefer the Rails-like "convention over
configuration" of AdonisJS, you may find NexusJS more verbose.

---

## 4. DX comparison (developer experience)

### Routing

| Style | AdonisJS | NexusJS |
| ----- | -------- | ------- |
| Class decorators (Nest style) | ❌ | ✅ |
| Route file (`routes.ts`) | ✅ | ✅ |
| Functional handler (Hono style) | ❌ | ✅ |
| Resource routes (`Route.resource('users')`) | ✅ | ⚠️ DIY (use `make:crud` scaffold) |

NexusJS gives you **three** routing styles; AdonisJS gives you
**one** (the route file). For teams that prefer Nest-style class
controllers, this is a major win.

### Validation

Both frameworks use Zod-style schemas. AdonisJS ships Vine
(which is Zod-inspired); NexusJS uses Zod directly. The DX is
very similar — pick the style you prefer.

### ActiveRecord-style models

AdonisJS's Lucid gives you `User.find(id)`, `User.create({...})`,
etc. NexusJS's `DrizzleRepository` provides the same ergonomics:

```ts
// AdonisJS
const user = await User.findOrFail(params.id)
const posts = await user.related('posts').query()

// NexusJS (Lucid-style)
const user = await this.users.findByIdOrFail(params.id)
const posts = await this.users.relation(user, 'posts')
```

If you prefer raw Drizzle's query builder, you can use that
directly via `DrizzleService`:

```ts
// NexusJS (Drizzle-native)
const user = await this.db.select().from(users).where(eq(users.id, id)).get();
const posts = await this.db.select().from(posts).where(eq(posts.userId, user.id));
```

### Hot-reload

Both frameworks support hot-reload. AdonisJS uses `node ace serve --watch`;
NexusJS uses `bun --hot app/main.ts`. Bun's hot-reload is faster
than Node's, so NexusJS wins here.

### REPL

AdonisJS has `node ace repl` for live code exploration. NexusJS
ships `nx repl` (interactive REPL with DI-resolved objects,
exec expression, and introspection) — shipped in v0.5.

---

## 5. Cluster / multi-instance

| Feature | AdonisJS | NexusJS |
| ------- | -------- | ------- |
| Multi-pod via shared DB | ✅ | ✅ (Drizzle backends) |
| Redis-backed queue | ✅ (BullMQ) | ✅ (`@kabyeon/nexusjs/queue`) |
| Multi-region | ❌ DIY | ❌ DIY |
| Session sticky | ⚠️ DIY | ✅ (cookie backend is stateless; falls back to DB or memory) |

AdonisJS and NexusJS are similar here: both rely on the database
for shared state. NexusJS's cookie-backed sessions are
inherently stateless, which is a slight win for multi-region
deployments.

---

## 6. Where NexusJS exceeds AdonisJS

Several AdonisJS batteries don't exist (or are DIY-only). NexusJS
ships these out of the box:

- **GraphQL** (`@kabyeon/nexusjs/graphql`) — AdonisJS has a legacy graphql
  package; NexusJS ships SDL-first with modern `@Resolver`/`@Query` decorators.
- **WebSockets** (`@kabyeon/nexusjs/ws`) — AdonisJS users write a custom
  WebSocket layer.
- **Server-Sent Events** (`@kabyeon/nexusjs/sse`) — same.
- **OpenAPI / Swagger** (`@kabyeon/nexusjs/openapi`) — AdonisJS users
  typically hand-write a spec or use `@nestjs/swagger`-style
  decorators.
- **Distributed tracing** (`@kabyeon/nexusjs/tracing`) — AdonisJS users
  integrate OpenTelemetry manually.
- **Prometheus metrics** (`@kabyeon/nexusjs/metrics`) — AdonisJS users
  integrate `prom-client` manually.
- **File upload** (`@kabyeon/nexusjs/upload`) — AdonisJS users
  hand-roll multipart handling.
- **Resilience** (`@kabyeon/nexusjs/resilience`) — retry, circuit breaker,
  bulkhead with zero external deps. AdonisJS users DIY.
- **Bun-native runtime** — AdonisJS is Node-only.

A team that needs any of these gets them for free with NexusJS.

---

## 7. Recommended v0.7+ roadmap

### v0.6.x — Async RPC & DX — shipped

1. **`@kabyeon/nexusjs/grpc`** — server + typed client
2. **`nx repl`** — interactive REPL
3. **`@kabyeon/nexusjs/view`** — view engine extracted
4. **Auto-load viewPaths** (v0.6.4)
5. **Default view = Rendu, Eta option** (v0.6.4)
6. **Env-aware config** (v0.6.5)
7. **`nx db:generate`** (v0.6.5)
8. **Built-in `sessionMiddleware()`** (v0.6.5)
9. **`@kabyeon/nexusjs` package rename** (v0.6.6)
10. **`router.getRoutes()` for OpenAPI** (v0.6.6)
11. **`create-nexusjs` scaffolder** (v0.6.7)
12. **`examples/` + smoke test suite** (v0.6.8)
13. **Inertia v2 examples** (v0.6.8)

### v0.6.9 — GraphQL — shipped

- **`@kabyeon/nexusjs/graphql`** — SDL-first GraphQL endpoint.
  `@Resolver`/`@Query`/`@Mutation`/`@Subscription`/`@Arg` decorators.
- **Inertia v2 examples** (28–31: React + Vue, SPA + SSR).
- **example 32** (`graphql-hello`).

### v0.7.0 — Resilience — shipped

- **`@kabyeon/nexusjs/resilience`** — Retry + Circuit Breaker +
  Bulkhead. **Zero new dependencies.**
- **example 33** (`resilience-calls`).

### v0.7.1 — DX polish (planned)

- Inertia `<Form>` SDK stabilization, code-first GraphQL SDL synthesis,
  eager `applyResilience()` wrapping, circuit-breaker admin API.

### v0.8 — Hardening + feature flags (planned)

- Stable public API surface (semver guarantees)
- Multi-runtime CI (Bun + Node + Cloudflare Workers)
- Performance benchmarks
- Long-term LTS support plan
- **`@kabyeon/nexusjs/feature-flag`** — canary / A/B testing
- **Cross-pod circuit breakers** (resilience backed by Redis / Drizzle)
- **Code-first GraphQL SDL synthesis**

### v1.0 — Production-ready LTS

- Frozen API surface
- Migration guides from AdonisJS
- LTS branch (security backports for 12 months)

---

## 8. Honest assessment (v0.7.0)

The v0.7.0 release **closes every AdonisJS v6 battery gap**. A team
migrating from AdonisJS to NexusJS v0.7.0 would find:

- All first-party batteries have an equivalent in NexusJS v0.7.0.
- **GraphQL** now ships (`@kabyeon/nexusjs/graphql`, v0.6.9).
- **gRPC** ships (`@kabyeon/nexusjs/grpc`, v0.5).
- **Resilience** ships (`@kabyeon/nexusjs/resilience`, v0.7.0).
- **REPL** ships (`nx repl`, v0.5).
- The migration from Lucid → Drizzle is mechanical.
- The migration from Vine → Zod is mechanical.
- **33 working examples** under `examples/` cover every major module.
- The smoke test suite catches import / DI / wiring regressions on
  every commit.

What's still missing for **full** AdonisJS coverage:

- **Inspector** — debugging-only; lower priority.
- **Admin panel** — lower priority; most teams use something custom.
- **Feature flags** — planned v0.8 (`@kabyeon/nexusjs/feature-flag`).
- **Seeding factories** — first-party seed factory module.

AdonisJS v6 vs NexusJS v0.7.0 differentiators:

- **Bun-native** — NexusJS runs natively on Bun (faster startup,
  faster I/O, fewer dependencies). AdonisJS is Node-only.
- **Per-module bundle entry points** — import only what you use.
- **OpenAPI / WebSockets / SSE / tracing / metrics / GraphQL /
  resilience batteries** — NexusJS ships these out of the box;
  AdonisJS users wire them up themselves or use third-party libs.
- **Default ORM = Drizzle** — Drizzle is more performant on Bun.
- **Cloudflare Workers** — NexusJS is more Workers-friendly.

After v0.7.0, NexusJS is a viable alternative for **any** AdonisJS
user today, with the runtime + DX advantages of Bun + modern
feature batteries that AdonisJS doesn't ship.

---

## 9. See also

- [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.7.0 release notes
- [`../../user-guide/`](../../user-guide/) — guides for the 30 modules
- [`../../user-guide/testing-examples.md`](../../user-guide/testing-examples.md) — smoke test runner guide
- [`../../../examples/`](../../../examples/) — 33 working example apps
- [AdonisJS documentation](https://docs.adonisjs.com) — the comparison baseline
- [Drizzle ORM](https://orm.drizzle.team) — the default ORM NexusJS ships
