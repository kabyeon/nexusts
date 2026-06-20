# NexusJS

**Bun Native Fullstack Framework** — NestJS structure × Adonis productivity × Hono edge performance.

> **v0.2** — feature-complete MVP. MVC core, DI, validation, three
> routing styles, view engines (Rendu / Edge / Inertia), auth
> (Session / JWT / OAuth / Passkey), queue (BullMQ / Cloudflare),
> schedule (`@Cron` / `@Interval` / `@Timeout`), events
> (`@OnEvent`), session (cookie / memory), and `nx` CLI all ship
> out of the box. Cloudflare D1/KV/R2/DO adapters and AI agent
> module are next (v0.3).

---

## Why Nexus?

| Capability                       | NestJS | Adonis | Hono  | **Nexus** |
| -------------------------------- | :----: | :----: | :---: | :-------: |
| Bun-native runtime               |   ❌   |   △    |   ✅   |    ✅     |
| Cloudflare Workers / Edge        |   △    |   ❌   |   ✅   |    ✅     |
| MVC + Service + Repository       |   △    |   ✅   |   ❌   |    ✅     |
| Class decorators (Nest style)    |   ✅   |   ❌   |   ❌   |    ✅     |
| Adonis-style router              |   ❌   |   ✅   |   ❌   |    ✅     |
| Functional handler (Hono style)  |   △    |   ❌   |   ✅   |    ✅     |
| Zod validation pipeline          |   △    |   ✅   |   ❌   |    ✅     |
| Three view engines (Rendu/Edge/Inertia) | ❌ |   ✅   |   ❌   |    ✅     |

---

## Install

```bash
bun create nexus my-app   # (planned)
cd my-app
bun install
bun run dev
```

Or use it as a library in an existing project:

```bash
bun add nexus reflect-metadata zod hono
```

---

## Quick start

```ts
// src/app/main.ts
import 'reflect-metadata';
import { Application } from 'nexus';
import { AppModule } from './app.module.js';

const app = new Application(AppModule);
await app.listen(3000);
```

```ts
// src/app/app.module.ts
import { Module } from 'nexus';
import { UserModule } from './modules/user.module.js';

@Module({ imports: [UserModule] })
export class AppModule {}
```

```ts
// src/app/modules/user.module.ts
import { Module } from 'nexus';
import { UserController } from '../controllers/user.controller.js';
import { UserService } from '../services/user.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

```ts
// src/app/services/user.service.ts
import { Injectable } from 'nexus';

@Injectable()
export class UserService {
  private users = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];

  findAll() { return this.users; }

  create(data: { name: string; email: string }) {
    const user = { id: this.users.length + 1, ...data };
    this.users.push(user);
    return user;
  }
}
```

```ts
// src/app/controllers/user.controller.ts
import { z } from 'zod';
import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Validate } from 'nexus';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  constructor(@Inject(UserService) private readonly users: UserService) {}

  @Get('/')
  @Validate({
    query: z.object({ q: z.string().optional(), limit: z.coerce.number().int().max(100).optional() }),
  })
  async index(@Query() query: { q?: string; limit?: number }) {
    return this.users.findAll();
  }

  @Post('/')
  @Validate({ body: CreateUserSchema })
  async create(@Body() body: z.infer<typeof CreateUserSchema>) {
    return { status: 201, body: this.users.create(body) };
  }
}
```

```bash
$ bun run dev
[nexus] Routes registered. Listening on :3000
[nexus] Listening on http://localhost:3000

$ curl http://localhost:3000/users
[{"id":1,"name":"Alice","email":"alice@example.com"}]

$ curl -X POST http://localhost:3000/users \
       -H "Content-Type: application/json" \
       -d '{"name":"Bob","email":"bob@example.com"}'
{"id":2,"name":"Bob","email":"bob@example.com"}
```

---

## Three routing styles

### 1. Nest style (class decorators)

```ts
@Controller('/users')
class UserController {
  constructor(@Inject(UserService) private users: UserService) {}

  @Get('/')        list() {}
  @Get('/:id')     show(@Param('id') id: string) {}
  @Post('/')       create(@Body() body: CreateUserDto) {}
  @Put('/:id')     update(@Param('id') id: string, @Body() body: UpdateUserDto) {}
  @Delete('/:id')  destroy(@Param('id') id: string) {}
}
```

### 2. Adonis style

```ts
app.server.router.add('GET',  '/users',      UserController, 'list');
app.server.router.add('POST', '/users',      UserController, 'create');
app.server.router.add('GET',  '/users/:id',  UserController, 'show');
app.server.router.add('DELETE', '/users/:id', UserController, 'destroy');
```

### 3. Functional style (Hono-native)

```ts
app.server.router.raw('GET', '/health', (c) => c.json({ ok: true }));
app.server.router.raw('POST', '/webhooks/stripe', async (c) => {
  const event = await c.req.json();
  // ...
});
```

---

## Parameter decorators

| Decorator    | Reads                                         |
| ------------ | --------------------------------------------- |
| `@Body(key?)`| Parsed request body (JSON / form / multipart) |
| `@Query(k?)` | URL query string                              |
| `@Param(k?)` | Path parameters                               |
| `@Headers(k?)`| Request headers                              |
| `@Req()` / `@Ctx()` | Hono context                        |
| `@Res()`     | Hono response                                 |
| `@Next()`    | next() callback (for middleware-style)       |
| `@User()`    | Authenticated user (set by auth middleware)   |

When a parameter has no key argument (e.g. `@Body()`), the full parsed
object is injected. With a key (e.g. `@Param('id')`), only that property
is injected.

---

## Validation with Zod

```ts
@Post('/')
@Validate({
  body: z.object({ name: z.string(), email: z.string().email() }),
  query: z.object({ dryRun: z.coerce.boolean().optional() }),
  params: z.object({ id: z.coerce.number() }),
})
async create(@Body() body, @Query() query, @Param() params) { ... }
```

Failed validation returns a 400 with details:

```json
{
  "error": "Validation failed",
  "issues": [
    { "code": "invalid_string", "validation": "email", "path": ["email"], "message": "Invalid email" }
  ]
}
```

---

## Dependency injection

NestJS-style constructor injection via the `@Inject(Token)` parameter
decorator. Use `@Injectable()` on services and repositories, and the
container resolves the dependency graph automatically.

```ts
@Injectable()
class UserService {
  constructor(@Inject('DB') private db: DrizzleLike) {}
}

@Injectable()
class UserRepository {
  constructor(@Inject('DB') private db: DrizzleLike) {}
}

@Module({
  providers: [
    UserService,
    UserRepository,
    { provide: 'DB', useValue: drizzleInstance },
  ],
  exports: [UserService],
})
class UserModule {}
```

> **Why `@Inject(Token)`?** Bun's native TypeScript transformer does not
> emit `design:paramtypes` metadata. The framework falls back to
> explicit `@Inject()` tokens for portability. If you build with `tsc`
> first and run with `node` or `bun src/...`, the bare-type form works.

---

## Inertia.js adapter

Single-page-app UX without writing an API. The framework ships a
server-side [Inertia.js v2/v3 protocol](https://inertiajs.com/the-protocol)
adapter that returns either JSON (XHR) or a full HTML shell (first
load) depending on the request.

### Enable it

```ts
const app = new Application(AppModule, {
  inertia: {
    version: '1.0.0',                 // asset version for 409 on mismatch
    title: 'My App',
    sharedProps: () => ({              // per-request global props
      appName: 'My App',
      currentUser: await getCurrentUser(),
    }),
  },
});
```

### Render a page

```ts
@Controller('/users')
class UserController {
  constructor(@Inject(Inertia.TOKEN) private inertia: Inertia) {}

  @Get('/')
  index() {
    return this.inertia.render('Users/Index', {
      users: this.userService.findAll(),
    });
  }
}
```

The router detects the response (via a discriminator tag) and emits:

- **First load (no `X-Inertia` header)** — full HTML page with the page
  object embedded as `data-page` JSON.
- **Subsequent visits (`X-Inertia: true`)** — JSON page object only.

### Lazy-evaluation helpers

Wrap a callback in one of these helpers to control *when* it resolves
and how the client merges the value:

| Helper                | Behaviour                                              |
| --------------------- | ------------------------------------------------------ |
| `defer(fn, group?)`   | Send `null` placeholder; client refetches later        |
| `always(fn)`          | Include on every partial reload, even if filtered out  |
| `optional(fn, n?)`    | Skip on partial reloads when length ≤ threshold        |
| `merge(fn, ids?)`     | Client merges new value with previous (pagination)     |
| `deepMerge(fn)`       | Client deep-merges new value with previous             |
| `once(fn)`            | Include only on the first (HTML) load                  |

```ts
@Get('/dashboard')
dashboard() {
  return this.inertia.render('Dashboard', {
    // Always included, even when the client only fetches one prop.
    currentUser: always(() => ({ id: 1, name: 'Alice' })),

    // Deferred — placeholder, then a follow-up partial reload.
    stats: defer(async () => ({ visits: 1234 }), 'metrics'),

    // Pagination — the client appends to its existing array.
    users: merge(() => this.userService.page(1), [['id']]),

    // Only on first page load (HTML).
    featureFlags: once(() => ({ newDashboard: true })),
  });
}
```

### Asset versioning

When `version` is configured and the client's `X-Inertia-Version`
header doesn't match, the adapter responds with **409 Conflict** and
the `X-Inertia-Location` header pointing at the same URL — the client
then does a full page reload (refetching CSS/JS bundles).

```http
GET /dashboard
X-Inertia: true
X-Inertia-Version: 0.9.0

HTTP/1.1 409 Conflict
X-Inertia-Location: /dashboard
```

### Full-page navigation and history

Force the client to bypass Inertia's client-side history (useful for
logout or any flow where you want a clean reload):

```ts
@Post('/logout')
logout() {
  // 303-style redirect — full page reload to /login.
  return this.inertia.location('/login');
}
```

`inertia.back()` returns a 302 with `Location: back` — the client
steps back in its history.

### Shared data

```ts
app.inertia.share('flash', { type: 'success', message: 'Saved!' });
// or
app.inertia.share({ csrfToken: '...', currentUser: { id: 1 } });
```

Shared props appear in every page response and survive partial reloads.

### SSR

Plug in a server-side renderer for React, Vue, Svelte, or Solid:

```ts
import { reactSsr } from '@nexus/inertia-react';

app.inertia.setSsrAdapter(reactSsr());
```

Without an adapter the framework falls back to a minimal HTML shell —
the client hydrates from `data-page` after JS loads. (This is the
recommended starting point.)

### Protocol reference

- **Response headers**
  - `Vary: X-Inertia` — every response
  - `X-Inertia: true` — JSON responses only
  - `X-Inertia-Location: <url>` — on 409 (asset version mismatch) and
    `inertia.location(...)`
- **Request headers** (sent by the client)
  - `X-Inertia: true` — marks an XHR visit
  - `X-Inertia-Version: <string>` — for asset mismatch checks
  - `X-Inertia-Partial-Component: <name>` — for partial reloads
  - `X-Inertia-Partial-Data: a,b,c` — `only` filter
  - `X-Inertia-Partial-Except: a,b,c` — `except` filter
  - `X-Inertia-Reset: a,b,c` — client-discard markers

---

## View engine

The framework ships with a Rendu adapter (PHP-style templates, fast on
every runtime) and an Edge adapter (mustache-style, AdonisJS-compatible).

```ts
import { RenduAdapter } from 'nexus/view';

const rendu = new RenduAdapter();
const html = await rendu.render(
  `<h1>Hello, <?= name ?>!</h1>
   <? for (const item of items) { ?>
     <li><?= item ?></li>
   <? } ?>`,
  { name: 'Nexus', items: ['a', 'b', 'c'] }
);
```

To use a different engine, implement the `ViewAdapter` interface:

```ts
import type { ViewAdapter } from 'nexus/view';

class MyEngine implements ViewAdapter {
  readonly name = 'my-engine';
  async render(template: string, data: Record<string, any>) { /* ... */ }
}

app.setViewAdapter(new MyEngine());
```

Or use the controller-level shortcut:

```ts
@Get('/users')
async index() {
  return {
    view: '<h1>Users</h1><?= users.length ?>',
    data: { users: this.users.findAll() },
  };
}
```

---

## Runtime adapters

The framework auto-detects Bun, Node, and Cloudflare Workers and loads
the appropriate adapter.

```ts
// Bun (default)
await app.listen(3000);

// Node
// (no extra setup — the server picks the Node adapter automatically)

// Cloudflare Workers
export default {
  fetch: app.fetch,
};
```

---

## Project layout (the framework source)

```
src/core/
├── constants.ts          # Metadata keys, param types
├── application.ts        # Main Application class
├── di/
│   ├── tokens.ts         # InjectionToken, Provider, ModuleOptions
│   ├── container.ts      # DIContainer + ApplicationContainer
│   └── scanner.ts        # ModuleScanner
├── decorators/
│   ├── module.ts         # @Module
│   ├── controller.ts     # @Controller
│   ├── injectable.ts     # @Injectable, @Inject
│   ├── http-methods.ts   # @Get, @Post, ...
│   ├── params.ts         # @Body, @Query, @Param, ...
│   ├── validate.ts       # @Validate
│   └── repository.ts     # @Repository
├── http/
│   ├── server.ts         # NexusServer (Hono wrapper)
│   ├── router.ts         # Multi-style router
│   ├── middleware.ts     # logger / errorHandler
│   └── context.ts        # Hono context types
├── validation/
│   └── validator.ts      # Zod schema runner
├── view/
│   ├── types.ts          # ViewAdapter interface
│   ├── rendu.ts          # Rendu adapter
│   ├── edge.ts           # Edge adapter
│   └── inertia/          # Inertia.js v2/v3 adapter
│       ├── types.ts
│       ├── helpers.ts          # defer, always, optional, merge, deepMerge, once, lazy
│       ├── inertia-adapter.ts  # Inertia class (render, form, share, location, back)
│       ├── inertia-response.ts # XHR vs HTML serialization
│       ├── form-helper.ts      # InertiaFormBuilder (errors, errorBag, PRG)
│       ├── form-middleware.ts  # CSRF + body parsing
│       ├── default-ssr.ts      # HTML shell renderer
│       └── ssr/                # React / Vue / Svelte / Solid adapters
├── orm/
│   └── drizzle-adapter.ts # Optional Drizzle integration
└── runtime/
    ├── bun.ts            # Bun.serve adapter
    ├── node.ts           # node:http adapter
    └── cloudflare.ts     # Workers fetch adapter
```

---

## Roadmap

**v0.2 (current)** — feature modules, integrations, dev tooling.

- ✅ MVC + DI + validation + view foundation
- ✅ **`nexus/auth`** — Session / JWT / OAuth / Passkey (better-auth)
- ✅ **`nexus/queue`** — BullMQ / Cloudflare Queues
- ✅ **`nexus/schedule`** — `@Cron` / `@Interval` / `@Timeout`
- ✅ **`nexus/events`** — `@OnEvent` with wildcards, priorities, guards
- ✅ **`nexus/session`** — cookie (HMAC) / memory backends
- ✅ **`nx` CLI** — Adonis ACE / Rails-style scaffolds
- ✅ Design docs + user guides (English + Korean)

**v0.3 (next)** — persistence, edge, AI.

- Redis session backend (`SessionModule.forRoot({ backend: 'redis' })`)
- Database session backend (Drizzle / Prisma adapter)
- CSRF token integration + flash-message middleware
- Distributed session rotation
- Cloudflare D1 / KV / R2 / Durable Objects adapters
- AI agent module + MCP server
- `nx` improvements: completion scripts, plugin system, hot-reload

**v0.4** — SSR, observability.

- React / Vue / Svelte / Solid SSR adapter improvements
- Edge streaming view engine
- OpenTelemetry / Prometheus exporter
- `nx dev` hot reload for worker code
- Email integration (transactional + templating)

**v0.5 → 1.0** — production hardening.

- Schema migration tool (Drizzle-style generate / apply)
- Production-grade rate limiting + WAF integration
- Stable public API surface (semver guarantees)
- Removal of all `v0.1` deprecated aliases (`@CurrentUser` → `@User`,
  `@CurrentSession` → `@Session`, etc.)

---

## License

MIT

### Forms (`<Form>` server-side helper)

Inertia v3's `<Form>` component pairs with this server-side helper to
keep form submissions out of the controller's hot path. The pattern
is the classic **Post/Redirect/Get**:

```ts
import { z } from 'zod';
import { Body, Controller, Post } from 'nexus';
import { Inertia } from 'nexus/view/inertia';

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Controller('/users')
class UserController {
  constructor(@Inject(Inertia.TOKEN) private inertia: Inertia) {}

  @Post('/')
  async store(@Body() input: Record<string, any>) {
    const form = this.inertia.form('Users/Create');
    const result = UserSchema.safeParse(input);

    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        (errors[path] ??= []).push(issue.message);
      }
      return form
        .withErrorBag('createUser')
        .withErrors(errors)
        .withValues(input)   // re-populate the form
        .render();
    }

    return form.redirect('/users'); // 303 (PRG pattern)
  }
}
```

| Builder method   | Effect                                                     |
| ---------------- | ---------------------------------------------------------- |
| `withProps()`    | Merge a batch of props at once                             |
| `with(k, v)`     | Set a single prop                                          |
| `withErrors()`   | Attach validation errors (string or string[]) per field   |
| `withError()`    | Add a single error to a field                              |
| `withErrorBag()` | Name the form's error namespace (multiple forms / page)   |
| `withValues()`   | Re-populate the form inputs after a failed submission      |
| `render()`       | Emit the page (with errors + values injected)             |
| `redirect(url)`  | 303 redirect (PRG — prevents double-submit)                |
| `back(to?)`      | 303 redirect to `back` (or a specific URL)                 |

### Lazy props

`lazy(fn, tag?)` wraps a callback so its result is computed **once
per request** and shared across every key that points at the same
tag. Useful for any expensive computation that doesn't need to wait
for a partial reload but shouldn't repeat within the same response:

```ts
return this.inertia.render('Dashboard', {
  a: lazy(() => this.computeA(), 'stats'),
  b: lazy(() => this.computeB(), 'stats'),
});
```

### SSR adapters

The framework ships first-class adapters for React, Vue, Svelte,
and Solid. Each lazy-imports its engine — install only what you
use:

```ts
import { createReactAdapter, ComponentRegistry } from 'nexus/view/inertia/ssr';

const components = new ComponentRegistry()
  .register('Home', HomePage)
  .register('Users/Index', UsersIndexPage);

app.inertia.setSsrAdapter(createReactAdapter({ components }));
```

| Adapter                  | Engine    | SSR API                                        |
| ------------------------ | --------- | ---------------------------------------------- |
| `createReactAdapter`     | React 18+ | `react-dom/server.renderToString`              |
| `createVueAdapter`       | Vue 3     | `vue/server-renderer.renderToString`           |
| `createSvelteAdapter`    | Svelte 4/5| `svelte/server.render` or `Component.render`  |
| `createSolidAdapter`     | Solid     | `solid-js/web.renderToString`                  |

### Form middleware (CSRF)

```ts
import { inertiaFormMiddleware } from 'nexus/view/inertia';

app.server.app.use('*', inertiaFormMiddleware({
  validateCsrf: true,
  csrfHeader: 'X-CSRF-Token',
  csrfField: '_token',
  csrfSharedKey: 'csrfToken',
}));
```

Returns **419 Page Expired** on mismatch. The form helper still owns
the per-field validation flow; this is the upstream CSRF gate.
