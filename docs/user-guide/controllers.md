# Controllers & Decorators

> 한국어 버전: [`controllers.ko.md`](./controllers.ko.md)

Controllers are the entry point for HTTP requests. They map URLs to
methods, validate input, and return a response (JSON, a view, or an
Inertia page).

## 1. Three routing styles

NexusTS supports **three** styles side-by-side — pick the one that fits
each route.

### 1.1 Nest style (class decorators)

```ts
import { z } from 'zod';
import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Validate } from '@nexusts/core';
import { UserService } from '../services/user.service.js';

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
    return this.users.findAll(query);
  }

  @Get('/:id')
  show(@Param('id') id: string) {
    return this.users.findOne(Number(id));
  }

  @Post('/')
  @Validate({ body: CreateUserSchema })
  async create(@Body() body: z.infer<typeof CreateUserSchema>) {
    return { status: 201, body: this.users.create(body) };
  }

  @Put('/:id')
  @Validate({ body: CreateUserSchema.partial() })
  async update(@Param('id') id: string, @Body() body: Partial<z.infer<typeof CreateUserSchema>>) {
    return this.users.update(Number(id), body);
  }

  @Delete('/:id')
  async destroy(@Param('id') id: string) {
    return this.users.delete(Number(id));
  }
}
```

### 1.2 Adonis style

```ts
import { app } from '../main.js';
import { UserController } from '../controllers/user.controller.js';

app.server.router.add('GET',    '/users',      UserController, 'index');
app.server.router.add('POST',   '/users',      UserController, 'create');
app.server.router.add('GET',    '/users/:id',  UserController, 'show');
app.server.router.add('PUT',    '/users/:id',  UserController, 'update');
app.server.router.add('DELETE', '/users/:id',  UserController, 'destroy');
```

### 1.3 Functional style (Hono-native)

```ts
import { app } from '../main.js';

app.server.router.raw('GET', '/health', (c) => c.json({ ok: true }));

app.server.router.raw('POST', '/webhooks/stripe', async (c) => {
  const event = await c.req.json();
  // ...
  return c.json({ received: true });
});
```

The functional style is the **escape hatch**: anything Hono can do,
you can do here. Use it for webhooks, SSE, or anything that doesn't
fit a controller shape.

---

## 2. Class decorators

| Decorator | Target | Effect |
| --------- | ------ | ------ |
| `@Module({...})` | class | Marks a module root and declares `imports`, `controllers`, `providers`, `exports` |
| `@Controller(prefix)` | class | Marks a controller and sets a route prefix |
| `@Injectable()` | class | Marks a service / repository / provider as DI-managed |
| `@Repository()` | class | Same as `@Injectable()`, named for repositories |

```ts
import { Module } from '@nexusts/core';
import { UserController } from './controllers/user.controller.js';
import { UserService } from './services/user.service.js';
import { UserRepository } from './repositories/user.repository.js';

@Module({
  imports: [],                         // other modules
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],              // tokens to share with importing modules
})
export class UserModule {}
```

---

## 3. Method decorators

| Decorator | Effect |
| --------- | ------ |
| `@Get(path?)` | Map `GET` to this method |
| `@Post(path?)` | Map `POST` to this method |
| `@Put(path?)` | Map `PUT` to this method |
| `@Delete(path?)` | Map `DELETE` to this method |
| `@Patch(path?)` | Map `PATCH` to this method |
| `@Options(path?)` | Map `OPTIONS` to this method |
| `@Head(path?)` | Map `HEAD` to this method |

The `path` argument is **appended** to the controller prefix.

```ts
@Controller('/users')       // prefix: /users
class UserController {
  @Get('/')                  // → GET /users
  list() {}

  @Get('/:id')               // → GET /users/:id
  show(@Param('id') id: string) {}
}
```

If `path` is omitted, it defaults to `/`.

---

## 4. Parameter decorators

| Decorator | Reads |
| --------- | ----- |
| `@Body(key?)` | Parsed request body (JSON / form / multipart) |
| `@Query(key?)` | URL query string |
| `@Param(key?)` | Path parameters |
| `@Headers(key?)` | Request headers |
| `@Req()` / `@Ctx()` | The Hono context |
| `@Res()` | The Hono response helper |
| `@Next()` | `next()` callback for middleware-style handlers |
| `@User()` | Authenticated user (set by auth middleware) |

When a parameter has no key argument (`@Body()`, `@Query()`), the
**full** parsed object is injected. With a key (`@Param('id')`), only
that property is injected.

```ts
@Get('/:id')
show(
  @Param('id') id: string,       // single path param
  @Query('verbose') verbose: boolean | undefined,  // single query value
) {
  // ...
}
```

---

## 5. Returning a response

A controller method can return:

| Return type | Behaviour |
| ----------- | --------- |
| Plain object | Serialized as JSON with `Content-Type: application/json` |
| Array | Serialized as JSON array |
| `string` | Sent as `text/plain` |
| `Response` (Hono/standard) | Sent as-is |
| `InertiaResponse` | Routed through the Inertia pipeline |
| `Promise<...>` | Awaited, then serialized |
| `void` / `undefined` | `204 No Content` |
| `{ status, body }` | Explicit status + body |

```ts
@Get('/plain')
plain() {
  return { hello: 'world' };
}

@Get('/with-status')
withStatus() {
  return { status: 201, body: { created: true } };
}

@Get('/empty')
empty() {
  // 204
}

@Get('/inertia')
@Inject(Inertia.TOKEN) inertia!: Inertia;
inertia(@Inject(Inertia.TOKEN) inertia: Inertia) {
  return inertia.render('Dashboard', { ... });
}
```

---

## 6. Validation

Validation is opt-in via the `@Validate({...})` decorator. It runs
**before** the handler is invoked. See **[validation.md](./validation.md)**
for the full guide.

```ts
@Post('/')
@Validate({
  body: z.object({ name: z.string(), email: z.string().email() }),
  query: z.object({ dryRun: z.coerce.boolean().optional() }),
  params: z.object({ id: z.coerce.number() }),
})
async create(@Body() body, @Query() query, @Param() params) { ... }
```

Failed validation returns **400** with details:

```json
{
  "error": "Validation failed",
  "issues": [
    { "code": "invalid_string", "validation": "email", "path": ["email"], "message": "Invalid email" }
  ]
}
```

---

## 7. Returning views

To render a template, either return a view descriptor or use the
`Application.render` helper. See **[view-engines.md](./view-engines.md)**
for the full guide.

```ts
@Get('/about')
async about() {
  return {
    view: 'pages/about.edge',
    data: { team: 'Nexus' },
  };
}
```

Or use the helper directly:

```ts
@Get('/about')
async about() {
  const html = await app.render('pages/about.edge', { team: 'Nexus' });
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
```

---

## 8. Error handling

Throw standard errors — the framework converts them to JSON responses:

```ts
@Get('/:id')
show(@Param('id') id: string) {
  const user = this.users.findOne(Number(id));
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  return user;
}
```

`HttpError` (and any subclass) is rendered as `{ status, message }`.
A future release will add NestJS-style exception filters
(`@Catch(HttpError)`) for fine-grained control.

---

## 9. Async handlers

Handlers can be `async`. The router awaits the return value before
serializing.

```ts
@Get('/slow')
async slow() {
  const data = await this.api.fetchSomething();
  return data;
}
```

Async handlers run **per request** — there is no shared state between
requests unless you put it on a singleton service.

---

## 10. Routing tips

- **Order matters only for ties.** Literal segments win over parameters
  win over wildcards.
- **Use `:id` not `{id}`.** The router expects Hono / Express-style
  colon parameters.
- **Trailing slashes are normalized.** `/users` and `/users/` resolve
  to the same route.
- **CORS preflight** — `OPTIONS` is handled automatically by Hono's
  CORS middleware if installed. Add it via
  `app.server.app.use('*', cors())`.

---

## 11. Putting it together

A complete controller with DI, validation, and error handling:

```ts
import { z } from 'zod';
import { Body, Controller, Get, Inject, Param, Post, Validate } from '@nexusts/core';
import { UserService } from '../services/user.service.js';

const CreateUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

@Controller('/users')
export class UserController {
  constructor(@Inject(UserService) private readonly users: UserService) {}

  @Get('/')
  list() {
    return this.users.findAll();
  }

  @Get('/:id')
  show(@Param('id') id: string) {
    const u = this.users.findOne(Number(id));
    if (!u) throw new Error(`User ${id} not found`);
    return u;
  }

  @Post('/')
  @Validate({ body: CreateUserSchema })
  create(@Body() body: z.infer<typeof CreateUserSchema>) {
    return { status: 201, body: this.users.create(body) };
  }
}
```

```ts
// user.module.ts
import { Module } from '@nexusts/core';
import { UserController } from '../controllers/user.controller.js';
import { UserService } from '../services/user.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```
