# Validation

> 한국어 버전: [`validation.ko.md`](./validation.ko.md)

Validation is opt-in, Zod-based, and applied via the `@Validate(...)`
decorator. It runs **before** the controller method is invoked, so a
failing request never reaches your business logic.

## 0. Standard decorator validation (v0.9+)

In standard decorator mode, validation is done inline using Zod schemas
with `ctx.req.json()` / `ctx.req.param()`:

```ts
import { z } from 'zod';
import { Controller, Post, Get } from '@nexusts/core';
import type { Context } from 'hono';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  @Post('/')
  async create(ctx: Context) {
    const body = CreateUserSchema.parse(await ctx.req.json());
    return this.users.create(body);
  }

  @Get('/:id')
  async show(ctx: Context) {
    const id = z.coerce.number().int().positive().parse(ctx.req.param('id'));
    return this.users.findById(id);
  }
}
```

For inline coercion of query params and path params, use Zod's
`z.coerce.*` helpers directly in the handler. For request bodies,
use `schema.parse()` or `schema.safeParse()` with `await ctx.req.json()`.

> The `@Validate` decorator (legacy) still works with
> `experimentalDecorators: true`. See sections below for the legacy API.

---

## 1. The `@Validate` decorator *(Legacy)*

```ts
import { z } from 'zod';
import { Body, Controller, Param, Post, Query, Validate } from '@nexusts/core';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  @Post('/')
  @Validate({
    body: CreateUserSchema,
    query: z.object({ notify: z.coerce.boolean().optional() }),
    params: z.object({ id: z.coerce.number().int() }),
  })
  async create(
    @Body() body: z.infer<typeof CreateUserSchema>,
    @Query() query: { notify?: boolean },
    @Param() params: { id: number },
  ) {
    return this.users.create({ ...body, notify: query.notify, id: params.id });
  }
}
```

Each key in the decorator's argument is **optional** — declare only the
sources you want to validate.

| Key | Validates | Reads from |
| --- | --------- | ---------- |
| `body` | Request body | `@Body()` |
| `query` | URL query string | `@Query()` |
| `params` | Path parameters | `@Param()` |
| `headers` | Request headers | `@Headers()` |

---

## 2. Failed validation response

A failing validation returns **400 Bad Request** with details:

```json
{
  "error": "Validation failed",
  "issues": [
    {
      "code": "invalid_string",
      "validation": "email",
      "path": ["email"],
      "message": "Invalid email"
    },
    {
      "code": "too_small",
      "minimum": 2,
      "type": "string",
      "inclusive": true,
      "path": ["name"],
      "message": "String must contain at least 2 character(s)"
    }
  ]
}
```

The `issues` array follows [Zod's issue format](https://zod.dev/?id=handling-errors)
so you can format the response on the client with a familiar shape.

---

## 3. Coercion

Query strings and path parameters are **always strings**, so use Zod's
coercion helpers:

```ts
@Validate({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    sort: z.enum(['asc', 'desc']).default('asc'),
    dryRun: z.coerce.boolean().optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
})
```

`z.coerce.*` runs `Number(...)`, `Boolean(...)`, etc. on the input
**before** validation, so the schema sees the typed value.

---

## 4. Reusable schemas

Define schemas in a `dto/` directory and import them:

```
app/
├── modules/
│   └── user/
│       ├── user.controller.ts
│       ├── user.service.ts
│       └── dto/
│           ├── create-user.dto.ts
│           └── update-user.dto.ts
```

```ts
// dto/create-user.dto.ts
import { z } from 'zod';

export const CreateUserDto = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

export type CreateUser = z.infer<typeof CreateUserDto>;
```

```ts
// user.controller.ts
import { CreateUserDto } from './dto/create-user.dto.js';

@Post('/')
@Validate({ body: CreateUserDto })
create(@Body() body: CreateUser) {
  return this.users.create(body);
}
```

---

## 5. Partial updates

For PATCH endpoints, mark fields optional:

```ts
export const UpdateUserDto = CreateUserDto.partial();
```

For PUT endpoints, the schema should be **strict** — every field
required.

---

## 6. Cross-field validation

Use Zod's `.refine(...)` for cross-field rules:

```ts
const SignupDto = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

---

## 7. Async / context-aware validation

For rules that need external state (uniqueness checks, etc.), use
`.refine` with an async function and `parseAsync`:

```ts
const CreateUserDto = z.object({
  email: z.string().email(),
}).refine(
  async (d) => !(await this.users.findByEmail(d.email)),
  { message: 'Email already taken', path: ['email'] },
);
```

For controllers that need full async validation, the framework awaits
the result before invoking the handler. If a refine throws, the
request returns 400.

---

## 8. Custom error responses

To customize the 400 response shape, wrap `@Validate` in your own
decorator (or post-process in middleware):

```ts
import { Validate, type ValidationConfig } from '@nexusts/core';
import { ZodError } from 'zod';

export function ValidateV2(config: ValidationConfig) {
  // @Validate is a plain decorator — wrap with a thin layer
  // to convert Zod errors to your preferred shape.
  return Validate(config);
}
```

A future release will add an `@UseValidationFilter(...)` decorator for
fully custom 400 responses.

---

## 9. Bypassing validation

To skip validation entirely (e.g., for a webhook that accepts a free-form
body), simply don't apply `@Validate`. The `@Body()` parameter receives
the parsed object as-is.

For untrusted input, prefer to **always** validate — even a
`z.object({}).passthrough()` is better than no schema.

---

## 10. Common pitfalls

| Pitfall | Fix |
| ------- | --- |
| `z.coerce.number()` not converting `"42"` to `42` | You're probably running in a context where Zod sees the raw string. Make sure `@Validate` runs **before** your handler. |
| `path: ["email"]` instead of `path: ["user", "email"]` | Zod paths follow the schema structure, not the input object — `.refine` on the inner object flattens. Use `path: ['email']` for a top-level field. |
| Validation passes but `body` is `undefined` | The body wasn't sent as JSON. Set `Content-Type: application/json` on the client. |
| `params.id` is always a string | Use `z.coerce.number()` in the params schema, then `@Param('id')` to extract the typed value. |
| Schema not found at runtime | You're using an import that doesn't exist (typo, wrong file). The decorator records the schema object directly, so import errors fail at boot. |
