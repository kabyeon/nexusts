# Architecture Overview

> Last updated: v0.1 (MVC core)
> 한국어 버전: [`architecture.ko.md`](./architecture.ko.md)

## 1. Goals

NexusJS is a **Bun-native fullstack framework** designed around four
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

The framework is intentionally **small in scope** (the v0.1 MVP is the
core MVC + DI + validation + view foundation) and grows in well-isolated
modules.

---

## 2. Layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       Application                            │
│   (root module, container, server, inertia, view adapter)    │
├──────────────────────────────────────────────────────────────┤
│                       User code                              │
│   Modules · Controllers · Services · Repositories · DTOs     │
├──────────────────────────────────────────────────────────────┤
│                      Core (framework)                        │
│  ┌────────┐ ┌────────┐ ┌────────────┐ ┌───────────────────┐  │
│  │  DI    │ │  HTTP  │ │ Validation │ │     View          │  │
│  │container│ │server │ │ (Zod)      │ │ Rendu / Edge /    │  │
│  │scanner │ │router │ │            │ │ Inertia / SSR     │  │
│  └────────┘ └────────┘ └────────────┘ └───────────────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────────────────────────────────┐ │
│  │  ORM   │ │Runtime │ │           Decorators               │ │
│  │Drizzle │ │Bun/Node│ │ @Controller @Injectable @Module    │ │
│  │        │ │Cloudfl.│ │ @Get/@Post @Body/@Query @Validate  │ │
│  └────────┘ └────────┘ └────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                   Platform adapters                          │
│              Hono (HTTP core) · Drizzle · Zod                │
└──────────────────────────────────────────────────────────────┘
```

Every user-facing surface is implemented **above** the platform adapters
so the framework can swap them out (e.g., replace Drizzle with Prisma)
without changing application code.

---

## 3. Module tree

A NexusJS app is a tree of `@Module` nodes. The root module is passed
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
| `nexus/view` | View engines (default `RenduAdapter`) |
| `nexus/view/inertia` | Inertia adapter + helpers |
| `nexus/view/inertia/ssr` | React/Vue/Svelte/Solid SSR adapters |
| `nexus/orm` | ORM adapters (Drizzle today) |
| `nexus/runtime` | Runtime adapters |

The public entry point (`nexus`) only re-exports the stable, agreed-on
surface. Anything else is **advanced** and may change without a major
version bump.

---

## 9. What's intentionally **not** in v0.1

To keep the MVP focused and shippable, the following are deferred to
later versions:

- **Authentication** (session, JWT, OAuth, passkey) — v0.2
- **Queue** (BullMQ, Cloudflare Queues) — v0.2
- **Event system / scheduler** — v0.2
- **Cloudflare D1 / KV / R2 / Durable Objects adapters** — v0.3
- **AI agent module / MCP server** — v0.3
- **Edge streaming view engine** — v0.4

These will be added in well-isolated modules that don't break the
existing API.

---

## 10. Design principles · 설계 원칙 요약

| Principle | Implementation |
| --------- | -------------- |
| Decorators are an **opt-in sugar layer** | Removing all decorators still leaves a working app via the raw router API. |
| The router is **the single source of truth** for matching | Decorator-driven routes register through the same router. |
| The DI graph is **constructed eagerly** at startup | Failures surface at boot, not at request time. |
| Every async boundary is **await-able in a Worker** | No `setTimeout`-driven hot paths; no Node-only APIs. |
| Public surface stays **small** | Anything experimental is behind a `nexus/<x>` sub-path. |
