# NexusJS vs AdonisJS — Feature Gap Analysis

> 한국어 버전: [`adonisjs-comparison.ko.md`](./adonisjs-comparison.ko.md)
> 분석 일자: 2026-06-22 · 기준: NexusJS **v0.6.4**

This document compares NexusJS v0.6 against [AdonisJS v6](https://adonisjs.com)
to identify which AdonisJS-style "batteries" (convention-driven,
"everything just works" features) are **present**, **partially
present**, or **missing**. The v0.3, v0.4, and v0.5 milestones
together closed every Tier 1 and Tier 2 gap; the framework now
covers essentially every battery AdonisJS ships.

> **Important**: AdonisJS is a 9-year-old framework, 5 years
> ahead of NexusJS. It has dozens of first-party packages
> (`@adonisjs/*`) that are highly opinionated. NexusJS deliberately
> ships a smaller core and a "compose your own stack" philosophy.
> The "gap" is therefore not so much feature parity as **battery
> coverage** — the level of "everything just works" AdonisJS is
> known for.

---

## 1. Summary table (v0.6)

Legend: ✅ ship · ⚠️ partial · ❌ missing · 🔵 third-party required

| Category | AdonisJS | NexusJS v0.6 | Notes |
|----------|----------|--------------|-------|
| HTTP server | ✅ Custom (Node & Workers) | ✅ Hono (Bun / Node / Workers) | Nexus uses Hono as the underlying server |
| Routing | ✅ Route groups, resources, subdomains | ✅ Class decorators + functional | Three styles: Nest, Adonis, Functional |
| Controllers | ✅ "thin" (Adonis convention) | ✅ "fat" (Nest-style with DI) | Both work; pick your style |
| Middleware | ✅ Class-based, ordered | ✅ Hono middleware (typed) | `app.use('*', mw)` |
| DI | ✅ IoC container, decorators | ✅ Class-based + `@Inject()` | Both Nest-style and Adonis-style |
| Validation | ✅ Vine (Zod-inspired) | ✅ Zod | Nexus uses Zod directly via `@Validate` |
| ORM | ✅ Lucid (built-in) | ✅ `@kabyeon/@kabyeon/nexusjs/drizzle` | Drizzle is the default ORM |
| Migrations | ✅ Built-in | ✅ `nx db:migrate` (drizzle-kit wrapper) | Same DX |
| Seeding | ✅ Built-in factories | ⚠️ DIY | No first-party; users write factories |
| Auth | ✅ `@adonisjs/auth` | ✅ `@kabyeon/@kabyeon/nexusjs/auth` (better-auth) | better-auth = many strategies |
| Sessions | ✅ `@adonisjs/session` | ✅ `@kabyeon/@kabyeon/nexusjs/session` | Cookie / Memory / Drizzle backends |
| Encryption | ✅ `@adonisjs/encryption` | ✅ `@kabyeon/@kabyeon/nexusjs/crypto` (AES-256-GCM + HMAC + scrypt) | Same API style |
| Hash | ✅ `@adonisjs/hash` | ✅ `@kabyeon/@kabyeon/nexusjs/crypto` (HashService) | Argon2 / scrypt |
| Shield | ✅ `@adonisjs/shield` (CSRF, headers) | ✅ `@kabyeon/@kabyeon/nexusjs/shield` (CSRF / HSTS / CSP) | Same naming, same purpose |
| Throttler | ✅ `@adonisjs/throttler` | ✅ `@kabyeon/@kabyeon/nexusjs/limiter` (fixed / sliding / token-bucket) | |
| Logger | ✅ `@adonisjs/logger` | ✅ `@kabyeon/@kabyeon/nexusjs/logger` (Pino) | |
| Mail | ✅ `@adonisjs/mail` | ✅ `@kabyeon/@kabyeon/nexusjs/mail` (SMTP / File / Null) | |
| Drive (file storage) | ✅ `@adonisjs/drive` | ✅ `@kabyeon/@kabyeon/nexusjs/drive` (Local / S3 / R2 / memory) | |
| Cache | ✅ `@adonisjs/cache` | ✅ `@kabyeon/@kabyeon/nexusjs/cache` (memory / Drizzle) | |
| Events | ✅ `@adonisjs/events` | ✅ `@kabyeon/@kabyeon/nexusjs/events` | wildcards, priorities, guards |
| Queue | ✅ `@adonisjs/queue` | ✅ `@kabyeon/@kabyeon/nexusjs/queue` (BullMQ / Cloudflare / memory) | |
| Scheduler | ✅ `@adonisjs/scheduler` | ✅ `@kabyeon/@kabyeon/nexusjs/schedule` (in-tree cron parser) | No external dep |
| Static | ✅ `@adonisjs/static` | ✅ `@kabyeon/@kabyeon/nexusjs/static` (ETag / Range / MIME) | |
| Health | ✅ `@adonisjs/health` | ✅ `@kabyeon/@kabyeon/nexusjs/health` (built-in indicators) | |
| SSE | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/sse` | Nexus ships SSE out of the box |
| WebSockets | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/ws` | Runtime auto-detected (Bun / Node) |
| Upload | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/upload` | `@Upload()` / `@UploadedFile()` decorators |
| i18n | ✅ `@adonisjs/i18n` | ✅ `@kabyeon/@kabyeon/nexusjs/i18n` | `Intl`-based, pluralization |
| OpenAPI | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/openapi` | Zod → OpenAPI 3.1 + Scalar UI |
| Tracing | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/tracing` | OpenTelemetry with lazy SDK |
| Metrics | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/metrics` | Prometheus / OpenMetrics |
| Bodyparser | ✅ Built-in | ✅ Hono's `c.req.parseBody()` + `@kabyeon/@kabyeon/nexusjs/upload` | |
| REPL | ✅ `node ace repl` | ✅ `nx repl` | Interactive REPL shipped in v0.5 |
| Inspector | ✅ `@adonisjs/inspector` | ❌ Not shipped | Debugging-only |
| Admin panel | ✅ `@adonisjs/admin` | ❌ Not shipped | Lower priority |
| GraphQL | ✅ `@adonisjs/graphql` (legacy) | ❌ None | Planned v0.7 |
| gRPC | ❌ DIY | ✅ `@kabyeon/@kabyeon/nexusjs/grpc` | Reflection-based, unary (streaming v2) |
| Feature flags | ❌ DIY | ❌ None | Planned v0.7 |
| Resilience (circuit breaker) | ❌ DIY | ❌ None | Planned v0.7 |

**Headline**: NexusJS v0.6 covers essentially every AdonisJS
battery (v6), and exceeds it on the "modern" features
(WebSockets, OpenAPI, SSE, tracing, metrics, gRPC) that AdonisJS
doesn't ship as batteries.

---

## 2. Closed in v0.3 + v0.4 + v0.5 (recent wins)

The v0.3, v0.4, and v0.5 milestones together closed every
"missing battery" gap that the v0.2 analysis identified.

| Was missing in v0.2 | Shipped | Module |
| ------------------- | ------- | ------ |
| Health checks | v0.3 | `@kabyeon/@kabyeon/nexusjs/health` |
| Rate limiting / throttling | v0.3 | `@kabyeon/@kabyeon/nexusjs/limiter` |
| Security headers (CSRF / HSTS / CSP) | v0.3 | `@kabyeon/@kabyeon/nexusjs/shield` |
| Configuration management | v0.3 | `@kabyeon/@kabyeon/nexusjs/config` |
| Logging | v0.3 | `@kabyeon/@kabyeon/nexusjs/logger` |
| Cache | v0.3 | `@kabyeon/@kabyeon/nexusjs/cache` |
| Email | v0.3 | `@kabyeon/@kabyeon/nexusjs/mail` |
| File storage (S3 / R2 / Local) | v0.3 | `@kabyeon/@kabyeon/nexusjs/drive` |
| Database (default ORM) | v0.3 | `@kabyeon/@kabyeon/nexusjs/drizzle` |
| Database migrations + CLI | v0.3 | `nx db:migrate` |
| Static file serving | v0.3 | `@kabyeon/@kabyeon/nexusjs/static` |
| **OpenAPI generator** | v0.4 | `@kabyeon/@kabyeon/nexusjs/openapi` |
| **File upload helper** | v0.4 | `@kabyeon/@kabyeon/nexusjs/upload` |
| **Request-scoped DI** | v0.4 | core DI + ALS + Hono middleware |
| **Server-Sent Events** | v0.4 | `@kabyeon/@kabyeon/nexusjs/sse` |
| **Distributed tracing** | v0.4 | `@kabyeon/@kabyeon/nexusjs/tracing` |
| **Prometheus metrics** | v0.4 | `@kabyeon/@kabyeon/nexusjs/metrics` |
| **WebSockets** | v0.5 | `@kabyeon/@kabyeon/nexusjs/ws` |
| **Encryption + password hashing** | v0.5 | `@kabyeon/@kabyeon/nexusjs/crypto` |
| **i18n** | v0.5 | `@kabyeon/@kabyeon/nexusjs/i18n` |

Total: **22 AdonisJS-style batteries** shipped in v0.3 + v0.4 + v0.5 + v0.6
(10 in v0.3 + 6 in v0.4 + 4 in v0.5 + 2 in v0.6: gRPC + REPL).

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
| **Number of first-party packages** | 30+ `@adonisjs/*` packages | 25 first-party modules under `@kabyeon/@kabyeon/nexusjs/*` |
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
| Redis-backed queue | ✅ (BullMQ) | ✅ (`@kabyeon/@kabyeon/nexusjs/queue`) |
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

- **WebSockets** (`@kabyeon/@kabyeon/nexusjs/ws`) — AdonisJS users write a custom
  WebSocket layer.
- **Server-Sent Events** (`@kabyeon/@kabyeon/nexusjs/sse`) — same.
- **OpenAPI / Swagger** (`@kabyeon/@kabyeon/nexusjs/openapi`) — AdonisJS users
  typically hand-write a spec or use `@nestjs/swagger`-style
  decorators.
- **Distributed tracing** (`@kabyeon/@kabyeon/nexusjs/tracing`) — AdonisJS users
  integrate OpenTelemetry manually.
- **Prometheus metrics** (`@kabyeon/@kabyeon/nexusjs/metrics`) — AdonisJS users
  integrate `prom-client` manually.
- **File upload** (`@kabyeon/@kabyeon/nexusjs/upload`) — AdonisJS users
  hand-roll multipart handling.
- **Bun-native runtime** — AdonisJS is Node-only.

A team that needs any of these gets them for free with NexusJS.

---

## 7. Recommended v0.7+ roadmap

### v0.6 — Async RPC & DX (current)

Shipped in v0.5–v0.6:

1. **`@kabyeon/@kabyeon/nexusjs/grpc`** — server + typed client (unary, reflection-based)
2. **`nx repl`** — interactive REPL
3. **`@kabyeon/@kabyeon/nexusjs/view`** — view engine extracted to separate bundle
4. **Auto-load viewPaths from nx.config.ts** — no explicit call needed

Still planned for v0.7+:

1. **`@kabyeon/@kabyeon/nexusjs/graphql`** — code-first schema
2. **`@kabyeon/@kabyeon/nexusjs/resilience`** — circuit breaker, retry, bulkhead
3. **`@kabyeon/@kabyeon/nexusjs/feature-flag`** — canary / A/B testing

### v0.7 — Hardening

- Stable public API surface (semver guarantees)
- Multi-runtime CI (Bun + Node + Cloudflare Workers)
- Performance benchmarks
- Long-term LTS support plan

### v1.0 — Production-ready LTS

- Frozen API surface
- Migration guides from AdonisJS
- LTS branch (security backports for 12 months)

---

## 8. Honest assessment (v0.6)

The v0.6 release **closes essentially every AdonisJS v6
battery gap**. A team migrating from AdonisJS to NexusJS v0.6 would
find:

- All first-party batteries have an equivalent in NexusJS v0.6.
- The migration from Lucid → Drizzle is mechanical (the
  `DrizzleRepository` mirrors Lucid's API).
- The migration from Vine → Zod is mechanical.
- The migration from `@adonisjs/auth` → `@kabyeon/@kabyeon/nexusjs/auth` is mostly
  trivial (better-auth has a similar API).
- The migration from `@adonisjs/session` → `@kabyeon/@kabyeon/nexusjs/session` is
  mostly trivial.
- The migration from `@adonisjs/encryption` / `hash` → `@kabyeon/@kabyeon/nexusjs/crypto`
  is a one-line change.

What's still missing for **full** AdonisJS coverage:

- **GraphQL** — important for teams that use it heavily.
- **gRPC** — important for polyglot service-mesh environments.
- **Feature flags** — useful for canary deploys.
- **Resilience primitives** — useful for external API calls.
- **REPL** — useful in early development; not blocking.
- **Admin panel** — lower priority; most teams use something
  custom.

AdonisJS v6 vs NexusJS v0.6 differentiators:

- **Bun-native** — NexusJS runs natively on Bun (faster startup,
  faster I/O, fewer dependencies). AdonisJS is Node-only.
- **Per-module bundle entry points** — `@kabyeon/@kabyeon/nexusjs/ws` doesn't ship
  in your bundle unless you use it. AdonisJS ships everything
  in one bundle.
- **OpenAPI / WebSockets / SSE / tracing / metrics batteries** —
  NexusJS ships these out of the box; AdonisJS users wire them
  up themselves.
- **Default ORM = Drizzle** — Drizzle is arguably more
  performant than Lucid on Bun. Lucid has better DX for the
  ActiveRecord-style crowd.
- **Cloudflare Workers** — NexusJS is more Workers-friendly
  (Hono's edge performance).

The path from v0.6 to "AdonisJS feature parity" is roughly the
same as the path from v0.6 to "NestJS feature parity":

- **v0.6** (Q4 2026): Async RPC & DX — GraphQL, gRPC, resilience,
  feature flags, REPL.
- **v0.7** (Q1 2027): Production hardening — stable public API,
  multi-runtime CI, performance benchmarks.
- **v1.0** (Q2 2027): Production-ready LTS — frozen API surface,
  AdonisJS migration guides, LTS branch.

After v0.6, NexusJS is a viable alternative for **any** AdonisJS
user today, with the runtime + DX advantages of Bun + the modern
feature batteries (OpenAPI, WebSockets, tracing, metrics, SSE)
that AdonisJS doesn't ship.

---

## 9. See also

- [`../../CHANGELOG.md`](../../CHANGELOG.md) — v0.6 release notes
- [`../README.md`](../../README.md) — current status & roadmap
- [`../../user-guide/`](../../user-guide/) — guides for the 26 modules
- [`./nestjs-comparison.md`](./nestjs-comparison.md) — companion analysis
- [AdonisJS documentation](https://docs.adonisjs.com) — the comparison baseline
- [Drizzle ORM](https://orm.drizzle.team) — the default ORM NexusJS ships
