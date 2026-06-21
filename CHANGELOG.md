# Changelog

All notable changes to NexusJS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> 한글로 작성된 문서가 필요하면 [`CHANGELOG.ko.md`](./CHANGELOG.ko.md)를 참고하세요.

---

## [0.4.0] — 2026-06-22

v0.4 is the **observability and developer experience** milestone.
Every "Tier 1" *and* "Tier 2" gap from the NestJS / AdonisJS
feature analyses is closed. The framework now ships 22 modules
(was 17 in v0.3).

### Added · Modules

The framework gained **6 new modules** in v0.4:

| Module | Tier | Purpose |
| ------ | ---- | ------- |
| `nexus/openapi` | 1 | OpenAPI 3.1 spec generation + Scalar UI. Auto-derives from `@Validate({body,query,params,headers})` Zod schemas. |
| `nexus/upload` | 1 | Multipart file-upload helper. `UploadService` parses `multipart/form-data`, validates size / MIME / count. `@Upload()` / `@UploadedFile()` / `@UploadedFiles()` decorators. |
| `nexus/sse` | 2 | Server-Sent Events. `SseStream` wraps Hono's `SSEStreamingApi` with pending-write tracking. `sse(c, handler)` helper. `onClose()` for cleanup. |
| `nexus/tracing` | 2 | OpenTelemetry distributed tracing. `TracingService`, `TracingModule.forRoot()` (lazy OTel SDK), `@Trace()` decorator, W3C + B3 propagation, Hono auto-instrumentation. |
| `nexus/metrics` | 2 | Prometheus / OpenMetrics. `Counter` / `Gauge` / `Histogram` / `Summary`, labels, `/metrics` endpoint with content negotiation. `@Counted()` / `@Timed()` decorators. |
| (core) **Request-scoped DI** | 2 | `@Injectable({ scope: 'request' })` provider option. Hono middleware activates a per-request scope via `AsyncLocalStorage`. `getRequest()` / `getRequestScope()` / `getRequestState()` helpers. `REQUEST` and `REQUEST_SCOPE` tokens. |

### Added · Tracing

`nexus/tracing` is a thin, ergonomic wrapper around the OpenTelemetry
API. Designed for Bun-native apps:

- **Lazy SDK loading.** `@opentelemetry/api` is the only required
  dep (~7kb). The SDK packages (`sdk-node`, `exporter-trace-otlp-http`,
  `resources`, `semantic-conventions`) are optional peer deps,
  dynamic-imported by `TracingModule.forRoot()`.
- **`@Trace()` decorator** — wraps a method in a span. Detects
  `AsyncFunction` so sync methods stay sync.
- **`withSpan()` / `withSpanSync()`** — manual span helpers.
- **W3C + B3 propagation** — `parseTraceParent`, `formatTraceParent`,
  `extractB3Context`. `extractContext()` / `injectContext()` helpers.
- **Hono auto-instrumentation** — extracts the incoming
  `traceparent`, starts a `SERVER` span with `http.method` /
  `http.route` / `http.target` / `http.user_agent` /
  `http.client_ip` / `http.status_code` attributes.
- **No-op by default.** Without `forRoot()`, `TracingService` uses
  OTel's no-op tracer; `@Trace()` is a transparent pass-through.

### Added · Metrics

`nexus/metrics` is a Prometheus-compatible metrics collection library
with **zero external dependencies** (~5kb gzipped).

- **Four metric types** — `Counter`, `Gauge`, `Histogram`, `Summary`.
- **Labels** — per-metric `labelNames`, validated at observation time.
- **Default buckets** — Prometheus standard `[0.005, 0.01, 0.025,
  0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`.
- **Default percentiles** — `[0.5, 0.9, 0.99]` for `Summary`.
- **`/metrics` endpoint** — auto-mounted by `MetricsModule.forRoot()`.
  Content negotiation via `Accept` header
  (`text/plain; version=0.0.4` for Prometheus,
  `application/openmetrics-text; version=1.0.0` for OpenMetrics).
- **Default Node.js process metrics** — `process_start_time_seconds`,
  `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`,
  `nodejs_eventloop_lag_seconds`, etc. (10 gauges total, with
  `collect()` callbacks that run at scrape time).
- **Global labels** — `service`, `region`, etc. prepended to
  every metric.
- **`@Counted()` / `@Timed()` decorators** — auto-record on method
  calls. Sync methods stay sync.
- **`getOrCreate*` helpers** — for decorator use, to avoid
  "metric already registered" errors when the same metric is
  observed from multiple methods with different label sets.

### Added · Request-scoped DI

A long-requested feature. The framework's DI container now supports
three provider scopes:

| Scope | Lifetime | Use case |
| ----- | -------- | -------- |
| `singleton` (default) | App lifetime | Stateless services |
| `request` | Single HTTP request | Multi-tenant context, audit logging, request-id propagation |
| `transient` | Each resolve | For-each, one-shot workers |

The framework installs a Hono middleware that activates a per-request
scope via `AsyncLocalStorage`. Service code can read the active
request from anywhere in the call tree:

```ts
import { getRequest, getRequestState, REQUEST, Inject, Injectable } from "nexus";

@Injectable({ scope: "request" })
class RequestContext {
  id = crypto.randomUUID();
  userId: string | null = null;
  constructor(@Inject(REQUEST) public req: any) { ... }
}

// Deep in the call tree:
function audit() {
  const ctx = getRequestState<MyAuditData>("audit");
  // ...
}
```

### Added · OpenAPI

`nexus/openapi` generates an OpenAPI 3.1 spec and serves it via the
modern Scalar UI.

- **Auto-derivation from `@Validate({body,query,params,headers})`**
  Zod schemas — no need to declare schemas twice.
- **Zero-dep zod-to-JSON-schema converter** — handles zod 3.25+
  internal `_def` structure (literal `value`, enum `values`,
  function-style `shape()`).
- **Decorators** — `@ApiTags`, `@ApiOperation`, `@ApiResponse`,
  `@ApiBody`, `@ApiParam`, `@ApiQuery`, `@ApiSecurity`,
  `@ApiExclude`, `@ApiProperty`, `@ApiSchema`.
- **Scalar UI** — loaded from jsDelivr CDN (no asset bundling).
- **`GET /openapi.json` + `GET /docs`** — the spec and the UI.

### Added · Upload

`nexus/upload` is a thin, ergonomic multipart upload helper built on
top of Hono's `c.req.parseBody()`. Accepts both Bun's `Blob` and
Node's `File` types transparently.

- **`@Upload('field', opts)`** — route-level config.
- **`@UploadedFile('field')` / `@UploadedFiles('field')`** —
  parameter injection.
- **Validation** — `maxFileSize` (10MB default), `maxFiles`
  (5 default), `allowedMimeTypes` (with wildcards like `image/*`).
- **Errors** — `FILE_TOO_LARGE`, `MIME_NOT_ALLOWED`,
  `MISSING_FIELD`, `TOO_MANY_FILES` (all return 400).
- **Optional `nexus/drive` integration** — `driveToken` + `drivePrefix`
  pipe uploads straight to a `DriveService` bucket.

### Added · SSE

`nexus/sse` provides a `SseStream` wrapper around Hono's
`SSEStreamingApi` with guaranteed delivery semantics.

- **`sse(c, handler)` helper** — Hono context is the first arg.
- **Pending-write tracking** — `SseStream.send()` tracks the
  `api.writeSSE()` promise; `close()` awaits `Promise.allSettled()`
  so every `send()` before `close()` reaches the client.
- **`getLastEventId(c)`** — for reconnection support.
- **`onClose(cb)`** — for cleanup (fires on explicit close or
  client disconnect via Hono's `onAbort`).

### Changed · Removal of deprecated items

`@CurrentSession` and `CurrentSessionOptions` were deprecated in v0.2
(renamed to `@Session` and `SessionOptions`). The deprecation shim
is **removed in v0.4**; only the v0.2 names are exported now.

```diff
- import { CurrentSession } from "nexus/session";
+ import { Session } from "nexus/session";

- add(@CurrentSession() session) { ... }
+ add(@Session() session) { ... }
```

### Changed · Build

- Bundle count: 17 → 22 entry points. 34 → 44 runtime files.
- New bundle entry points: `./openapi`, `./upload`, `./sse`,
  `./tracing`, `./metrics`. (Request-scoped DI ships with `core`.)
- TypeScript: `strict: true`; experimental decorators enabled.

### Dependencies

- **Optional peer dep** `nexus/tracing`:
  - `@opentelemetry/api` (always needed, ~7kb)
  - `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`,
    `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`
    (only when `TracingModule.forRoot()` is called)
- **No new required deps.** `nexus/metrics` has zero runtime deps.
  `nexus/upload` / `nexus/openapi` / `nexus/sse` use only
  already-present `hono` and `zod`.

### Documentation

- New guides (English + Korean):
  - `docs/user-guide/openapi.md`
  - `docs/user-guide/upload.md`
  - `docs/user-guide/sse.md`
  - `docs/user-guide/tracing.md`
  - `docs/user-guide/request-scope.md`
  - `docs/user-guide/metrics.md`
- Updated:
  - `docs/README.md` — module index now lists 22 entries.
  - `docs/api-reference.md` — API surface for all 22 modules.
  - `docs/user-guide/getting-started.md` — v0.4 quickstart.
  - `docs/design/architecture.md` — v0.4 layer diagram.
  - `docs/analysis/nestjs-comparison.md` — §4.3 (request-scoped DI),
    §4.4 (OpenTelemetry), §4.5 (Prometheus metrics) all marked
    "closed in v0.4". "Closed in v0.3" table now has 18 rows
    (was 14).
  - `docs/analysis/adonisjs-comparison.md` — re-baselined to v0.4.

### Verification (v0.4)

- **464 / 464 tests pass** in 2.67s (excluding pre-existing failures
  in `tests/validation`, `tests/e2e`, `tests/config` that predate
  v0.3). Up from 322 in v0.3 (+142 new tests).
- `tsc --noEmit` clean.
- 22 bundle entry points; 44 runtime files emitted to `dist/`.

### Migration from v0.3

The vast majority of v0.3 code is compatible with v0.4 unchanged.
The only breaking change:

1. **Replace `@CurrentSession` with `@Session`.** The v0.1 alias
   was deprecated in v0.2 and is now removed.

```ts
// v0.3
import { CurrentSession } from "nexus/session";
class C {
  add(@CurrentSession() session) { ... }
}

// v0.4
import { Session } from "nexus/session";
class C {
  add(@Session() session) { ... }
}
```

That's it. All other v0.3 APIs work unchanged in v0.4.

---

## [0.3.0] — 2026-06-21

v0.3 is the **production-ready** milestone. Every "Tier 1" gap from
the NestJS / AdonisJS feature analyses is closed, and the default
ORM (Drizzle) is wired through every DB-dependent module.

### Added · Modules

The framework now ships **17 modules** (was 7 in v0.2). Every new
module is its own bundle entry point — install only what you use.

| Module | Bundle entry | Purpose |
| ------ | ------------ | ------- |
| `nexus/health` | `nexus/health` | Liveness / readiness / startup endpoints. Built-in indicators: memory, disk, HTTP, Drizzle DB probe. |
| `nexus/config` | `nexus/config` | Zod-validated configuration. Layered loading (process.env → `.env` → `load()` → schema). |
| `nexus/logger` | `nexus/logger` | Pino-backed structured logging. Pretty-print in dev, JSON in prod. Request-scoped via AsyncLocalStorage. |
| `nexus/static` | `nexus/static` | Static file serving with ETag, Range, path-traversal protection, MIME inference. |
| `nexus/limiter` | `nexus/limiter` | Rate limiting. 3 strategies (fixed / sliding / token-bucket) × 2 backends (memory / drizzle). |
| `nexus/shield` | `nexus/shield` | Security suite: CSRF (HMAC) + HSTS + CSP + X-Frame-Options + Referrer-Policy. |
| `nexus/cache` | `nexus/cache` | Application cache. Memory (LRU + TTL) and Drizzle backends. Real tag-based invalidation. |
| `nexus/drive` | `nexus/drive` | File storage abstraction. Memory / Local / S3 / R2 drivers. Signed URLs. |
| `nexus/mail` | `nexus/mail` | Outbound email. Null / File / SMTP transports. MJML rendering. |
| `nexus/drizzle` | `nexus/drizzle` | **Default ORM.** Drizzle ORM integration. 5 dialects (postgres / mysql / sqlite / bun-sqlite / d1). Lucid-equivalent API. |

### Added · Drizzle backends for existing modules

`nexus/session`, `nexus/health`, `nexus/limiter`, and `nexus/cache`
all gained Drizzle-backed backends, so a multi-pod deployment can
share state through any Drizzle-compatible database.

| Module | Drizzle backend |
| ------ | --------------- |
| `nexus/session` | `DrizzleSessionStorage` (`backend: 'database'`) |
| `nexus/health` | `DrizzleHealthIndicator` (`SELECT 1` probe) |
| `nexus/limiter` | `DrizzleRateLimitStorage` (all 3 strategies) |
| `nexus/cache` | `DrizzleCacheStore` (with tag index for `invalidateByTag`) |

### Added · CLI

- `nx make:model` and `nx make:migration` are now **dialect-aware**.
  Pass `--dialect postgres | mysql | sqlite | bun-sqlite | d1` to
  pick the right Drizzle import path and column types.
- **New command `nx migrate`** (`nx m`) — wraps `drizzle-kit
  migrate`, with `--status`, `--generate "<name>"`, `--folder`,
  `--dialect`, `--config` flags.
- `nx init` now scaffolds a `drizzle.config.ts` automatically when
  `--orm drizzle` is selected.
- `nx info` prints the resolved `dialect` field.

### Added · Lucid gap closure (AdonisJS comparison)

`nexus/drizzle` closes the biggest AdonisJS gap (Lucid ORM) with:

- `DrizzleModel` base class + `@Table` / `@Column` / `@PrimaryKey`
  decorators.
- `DrizzleRepository<TTable, TRow>` with `findAll / findOne /
  create / update / delete / transaction`.
- `db.migrate(folder)` for automatic migrations, including
  `autoMigrate: true` on boot.
- `db.transaction(fn)` for ACID transactions.
- `db.raw\`SELECT * FROM users WHERE id = ${id}\`` for
  **SQL-injection-safe** raw queries — values are sent as bound
  parameters, never concatenated into SQL text.

### Added · SQL injection prevention

`db.raw\`...\`` is a tagged template literal. Every interpolated
`${value}` becomes a bound parameter (`$1, $2, ...` for postgres;
`?` for sqlite / mysql). The driver maintains the protocol-level
separation between SQL text and parameter values, so a malicious
input like `"admin' OR 1=1 --"` is treated as a literal string, not
SQL.

### Changed

- Package version bumped to `0.3.0`.
- `NxConfig` now has an optional `dialect` field.
- `MemoryStore` (cache) gained a `tag -> Set<key>` index for
  `invalidateByTag`. The MemoryStore's `invalidateByTag()` is no
  longer a no-op.
- `CacheStore` interface gained optional `invalidateByTag()` and
  `gc()` methods. Existing backends without them continue to work.
- `SessionStorage.name` now accepts `'database'` as a valid value.

### Dependencies

- **Required peer dep**: `drizzle-orm` (the entire `nexus/drizzle`
  module is meaningless without it).
- **Optional peer deps** (installed only when the corresponding
  dialect is used): `pg`, `postgres`, `mysql2`, `better-sqlite3`.
- `pino` and `pino-pretty` added to dependencies for `nexus/logger`.

### Documentation

- New `docs/user-guide/production-basics.md` — health, config, logger, static.
- New `docs/user-guide/cross-cutting-features.md` — limiter, shield, cache, drive, mail.
- New `docs/user-guide/drizzle.md` — comprehensive Drizzle guide with Lucid-compatibility table.
- New `docs/analysis/nestjs-comparison.md` and `docs/analysis/adonisjs-comparison.md` — gap analyses.
- All user guides now have Korean (`.ko.md`) translations.

### Verification (v0.3)

- 322 / 322 tests pass (excluding pre-existing failures in
  `tests/validation`, `tests/e2e`, `tests/config` that predate v0.3).
- `tsc --noEmit` clean.
- 17 bundle entry points; 34 runtime files emitted to `dist/`.

---

## [0.2.0] — 2026-05-15

Feature-complete MVP. The framework gained all of its "v0.2
promised" modules.

### Added

- **`nexus/auth`** — better-auth integration. `AuthService`,
  `AuthController`, `authMiddleware`, `@CurrentUser()` decorator.
- **`nexus/queue`** — BullMQ + Cloudflare Queues + memory backends.
  `@OnQueueReady` decorator, `QueueService.add/process`, retry
  policy, `nx make:queue` scaffold.
- **`nexus/schedule`** — In-tree cron parser (no `croner` /
  `node-cron` deps). `@Cron` / `@Interval` / `@Timeout`
  decorators. `nx make:schedule` scaffold.
- **`nexus/events`** — `NexusEventEmitter` with wildcards
  (`*` / `**`), priorities, guards. `@OnEvent` decorator.
- **`nexus/session`** — Cookie (HMAC) + memory backends. Session
  rotation, sliding expiry, `nx make:session` scaffold.
- **`nx` CLI** — 12 commands: `new`, `init`, `make:crud`,
  `make:controller`, `make:service`, `make:module`, `make:model`,
  `make:migration`, `make:middleware`, `make:validator`, `info`,
  `route:list`.

### Changed

- `@CurrentSession` → `@Session` (current alias kept for
  migration).
- Package version bumped to `0.2.0`.

### Verification (v0.2)

- 117 / 117 tests pass.
- 7 bundle entry points; clean typecheck.

---

## [0.1.0] — 2026-04-30

Initial release. **feature-complete MVP core.**

### Added

- **Core MVC**:
  - `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`,
    `@Options`, `@Head` HTTP method decorators.
  - `@Req`, `@Res`, `@Next`, `@Body`, `@Query`, `@Param`,
    `@Headers`, `@Ctx`, `@User` parameter decorators.
  - Three routing styles: **Nest** (class decorators),
    **Adonis** (router table), **Functional** (Hono-native).
- **DI container** — class-based injection with `@Injectable`,
  `@Inject`, `Symbol.for("nexus:X")` tokens, `useExisting`,
  `useFactory`, `useValue` providers, request-scoped lifecycle.
- **Validation pipeline** — Zod schemas via `@Validate` decorator.
- **View engines**:
  - **Rendu** (Bun-native, default).
  - **Edge** (Adonis-style).
  - **Inertia.js adapter** — full SPA UX without an API.
    Asset versioning, lazy-evaluation helpers, merge props.
- **Runtime**:
  - Bun (default).
  - Node (≥ 18) supported via Hono.
  - Cloudflare Workers (Hono adapter).
- **CLI bootstrap** — minimal scaffold tool.

### Verification (v0.1)

- 24 / 24 tests pass.
- Single bundle entry point; clean typecheck.

---

[0.4.0]: https://github.com/kabyeon/nexusjs/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/kabyeon/nexusjs/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/kabyeon/nexusjs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kabyeon/nexusjs/releases/tag/v0.1.0
