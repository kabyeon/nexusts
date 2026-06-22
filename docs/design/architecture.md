# Architecture Overview

> Last updated: v0.6.1 (gRPC + build pipeline)
> 한국어 버전: [`architecture.ko.md`](./architecture.ko.md)

## 1. Goals

NexusTS is a **Bun-native fullstack framework** designed around four
guiding principles:

1. **Multi-runtime** — the same code runs on Bun, Node.js, Deno, and
   Cloudflare Workers.
2. **Multi-paradigm** — the same app can mix Nest-style class decorators,
   Adonis-style route tables, and Hono-style functional handlers.
3. **Multi-renderer** — Rendu, Edge, and Inertia adapters are
   first-class citizens; SSR adapters for React, Vue, Svelte, and Solid
   plug in without forking the request pipeline.
4. **Edge-first** — every adapter is designed to fit inside a Workers
   request budget. No blocking I/O on the hot path.

In v0.6.1 the framework has grown to **26 independent modules** —
each a separate bundle entry point. The user picks only what they
need; the core stays small.

---

## 2. Layer diagram (v0.6.1)

```
┌──────────────────────────────────────────────────────────────┐
│                       Application                            │
│   (root module, container, server, inertia, view adapter)    │
├──────────────────────────────────────────────────────────────┤
│                       User code                              │
│   Modules · Controllers · Services · Repositories · DTOs     │
├──────────────────────────────────────────────────────────────┤
│                  Optional Modules (v0.6.1)                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ auth      │ │ queue      │ │ schedule   │ │ events     │  │
│  │ session   │ │ health     │ │ config     │ │ logger     │  │
│  │ static    │ │ limiter    │ │ shield     │ │ cache      │  │
│  │ drive     │ │ mail       │ │            │ │            │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ drizzle (default ORM — postgres/mysql/sqlite/d1)         │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                      Core (framework)                        │
│  ┌────────┐ ┌────────┐ ┌────────────┐ ┌───────────────────┐  │
│  │  DI    │ │  HTTP  │ │ Validation │ │     View          │  │
│  │container│ │server │ │ (Zod)      │ │ Rendu / Edge /    │  │
│  │scanner │ │router │ │            │ │ Inertia / SSR     │  │
│  └────────┘ └────────┘ └────────────┘ └───────────────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────────────────────────────────┐ │
│  │Runtime │ │  CLI   │ │           Decorators               │ │
│  │Bun/Node│ │ nx ... │ │ @Controller @Injectable @Module    │ │
│  │Cloudfl.│ │        │ │ @Get/@Post @Body/@Query @Validate  │ │
│  └────────┘ └────────┘ └────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                   Platform adapters                          │
│            Hono · Drizzle · Zod · Pino · BullMQ             │
└──────────────────────────────────────────────────────────────┘
```

Every user-facing surface is implemented **above** the platform adapters
so the framework can swap them out (e.g., replace Drizzle with Prisma)
without changing application code.

---

## 3. Module tree

A NexusTS app is a tree of `@Module` nodes. The root module is passed
to `new Application(...)`; the scanner walks the imports graph and
builds one `ApplicationContainer` per module:

```
RootModule
 ├── UserModule
 │    ├── UserController
 │    ├── UserService       (provider)
 │    ├── UserRepository    (provider)
 │    └── { provide: 'DB', useValue: drizzleInstance }
 ├── OrderModule
 │    ├── OrderController
 │    ├── OrderService
 │    └── StripeService     (provider)
 └── { provide: Inertia.TOKEN, useValue: appInertia }   ← registered by Application
```

Each module's container is **isolated** — providers are resolved within
their declaring module unless they are re-exported via `exports: [...]`.

> **Why per-module containers?** Modules are the unit of encapsulation
> in Nest/Adonis. Treating them as separate sub-containers lets the
> framework refuse to inject private providers and keeps the dependency
> graph auditable.

See [`di-container.md`](./di-container.md) for the full design.

---

## 4. Request lifecycle

A single HTTP request flows through the framework as follows:

```
Hono fetch event
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 1. Runtime adapter (Bun / Node / Cloudflare)               │
│    Normalizes the request into a Hono Context.             │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Global middleware                                       │
│    logger → errorHandler → formMiddleware → ...            │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Router                                                  │
│    - Adonis-style table lookup                             │
│    - Decorator-driven controller dispatch                  │
│    - Functional (raw Hono handler) passthrough             │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 4. Parameter extraction                                    │
│    @Body / @Query / @Param / @Headers / @Req / @Res /...  │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Validation                                              │
│    @Validate({ body, query, params })  ← Zod schemas       │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 6. Controller method invocation                            │
│    Dependencies injected from the owning module's          │
│    container.                                              │
└────────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────┐
│ 7. Response serialization                                  │
│    - Plain JSON                                            │
│    - View (Rendu / Edge)                                   │
│    - InertiaResponse → HTML shell (first load) or JSON     │
│      (XHR)                                                 │
└────────────────────────────────────────────────────────────┘
      │
      ▼
   Hono Response
```

Each step is implemented as a separate module so a user can replace
any of them (e.g., swap the logger for pino, swap the validator for
class-validator) without forking the rest.

---

## 5. Routing: three styles, one router

The router in `src/core/http/router.ts` exposes three registration APIs
backed by a single internal route table:

| Style | API | Use case |
| ----- | --- | -------- |
| **Nest** | `@Controller('/users')` + `@Get('/')` | Class-based services, large teams |
| **Adonis** | `router.add('GET', '/users', Ctrl, 'list')` | Quick CRUD, route table legibility |
| **Functional** | `router.raw('GET', '/health', handler)` | Edge handlers, webhooks, escape hatch |

The router stores routes as `{ method, path, handlers, kind, meta }`
records and compiles them into a Hono app on `start()`. The first match
wins; ties are resolved by specificity (literal segments before
parameters before wildcards).

---

## 6. The Inertia adapter

The Inertia adapter is **a special response type**, not a separate
framework. A controller returns `inertia.render('Users/Index', { users })`
which produces an `InertiaResponse` object carrying a discriminator
tag. The router inspects the tag and:

- On first-page loads (no `X-Inertia` header) → emits an HTML shell
  with `data-page` JSON embedded; the client hydrates from there.
- On XHR visits (`X-Inertia: true`) → emits a JSON page object.
- On asset version mismatch → 409 with `X-Inertia-Location`.

The adapter also implements Inertia v3's lazy-resolution protocol
(`defer`, `always`, `optional`, `merge`, `deepMerge`, `once`, `lazy`),
asset versioning, shared props, server-side rendering, and a
`<Form>` server-side helper that owns the
Post/Redirect/Get flow.

See [`inertia-adapter.md`](./inertia-adapter.md) for the full design.

---

## 7. Runtime adapters

The runtime adapter layer normalizes three very different execution
models behind a single `NexusServer.start()` API:

| Runtime | Adapter file | What it owns |
| ------- | ------------ | ------------ |
| **Bun** | `src/core/runtime/bun.ts` | `Bun.serve` lifecycle, port binding |
| **Node** | `src/core/runtime/node.ts` | `node:http` server, `process` signals |
| **Cloudflare Workers** | `src/core/runtime/cloudflare.ts` | `fetch` handler export |

The application auto-detects the runtime via `globalThis` symbols and
picks the right adapter at `start()`. For Workers, `app.fetch` is the
export; for Bun/Node, `app.listen(port)` is.

---

## 8. Extensibility surface

The framework deliberately exposes **sub-path imports** so advanced
users can swap internals without forking:

| Sub-path | Purpose |
| -------- | ------- |
| `@nexusts/view` | View engines (default `RenduAdapter`) |
| `@nexusts/view/inertia` | Inertia adapter + helpers |
| `@nexusts/view/inertia/ssr` | React/Vue/Svelte/Solid SSR adapters |
| `@nexusts/orm` | ORM adapters (Drizzle today) |
| `@nexusts/runtime` | Runtime adapters |

The public entry point (`@nexusts/core`) only re-exports the stable, agreed-on
surface. Anything else is **advanced** and may change without a major
version bump.

---

## 9. Modules shipped in v0.6.1

The framework is **17 independent modules**. Each is its own bundle
entry point — install only what you need.

| Module | Bundle subpath | Replaces / supersedes |
| ------ | -------------- | --------------------- |
| `@nexusts/core` | `@nexusts/core` | core MVC + DI + validation + views |
| `@nexusts/cli` | `nx` | Adonis ACE-style command runner |
| `@nexusts/auth` | `@nexusts/auth` | session, JWT, OAuth, passkey (better-auth) |
| `@nexusts/queue` | `@nexusts/queue` | BullMQ, Cloudflare Queues, memory |
| `@nexusts/schedule` | `@nexusts/schedule` | `@Cron` / `@Interval` / `@Timeout` |
| `@nexusts/events` | `@nexusts/events` | `@OnEvent` with wildcards, priorities, guards |
| `@nexusts/session` | `@nexusts/session` | cookie (HMAC), memory, Drizzle |
| `@nexusts/health` | `@nexusts/health` | liveness/readiness/startup, indicators |
| `@nexusts/config` | `@nexusts/config` | Zod-validated env config |
| `@nexusts/logger` | `@nexusts/logger` | Pino-backed structured logging |
| `@nexusts/static` | `@nexusts/static` | static file serving with ETag, Range |
| `@nexusts/limiter` | `@nexusts/limiter` | 3 strategies × memory/Drizzle storage |
| `@nexusts/shield` | `@nexusts/shield` | CSRF, HSTS, CSP, security headers |
| `@nexusts/cache` | `@nexusts/cache` | memory (LRU) / Drizzle, tag invalidation |
| `@nexusts/drive` | `@nexusts/drive` | memory/Local/S3/R2 storage abstraction |
| `@nexusts/mail` | `@nexusts/mail` | SMTP / File / Null, MJML |
| `@nexusts/drizzle` | `@nexusts/drizzle` | **default ORM** (5 dialects) |

### Drizzle as the data backbone

`@nexusts/drizzle` is the default ORM and is wired into every
DB-dependent module:

- `@nexusts/session` → `DrizzleSessionStorage`
- `@nexusts/health`  → `DrizzleHealthIndicator`
- `@nexusts/limiter` → `DrizzleRateLimitStorage`
- `@nexusts/cache`   → `DrizzleCacheStore`

A multi-pod deployment can share session, health, rate-limit, and
cache state through any Drizzle-compatible database.

---

## 10. What's planned for v0.6+

- **Observability**: `@nexusts/tracing` (OpenTelemetry), `@nexusts/metrics`
  (Prometheus).
- **i18n**: `@nexusts/i18n` for multi-locale messages.
- **AI agent module** + MCP server integration.
- **Stable public API** (semver guarantees).
- **Removal of v0.1 deprecated aliases**.

---

## 10. Design principles · 설계 원칙 요약

| Principle | Implementation |
| --------- | -------------- |
| Decorators are an **opt-in sugar layer** | Removing all decorators still leaves a working app via the raw router API. |
| The router is **the single source of truth** for matching | Decorator-driven routes register through the same router. |
| The DI graph is **constructed eagerly** at startup | Failures surface at boot, not at request time. |
| Every async boundary is **await-able in a Worker** | No `setTimeout`-driven hot paths; no Node-only APIs. |
| Public surface stays **small** | Anything experimental is behind a `@nexusts/<x>` sub-path. |
