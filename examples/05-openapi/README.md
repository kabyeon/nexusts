# 05 · OpenAPI

Generate an OpenAPI 3.1 spec + Scalar UI from controller decorators.

## What it shows

- `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam` decorators
- `OpenAPIModule.forRoot()` to register the service
- `setRoutes()` from `router.getRoutes()` (auto-wired)
- `OpenAPIModule.mount()` to expose `/docs` and `/docs/json`

## How to run

```bash
cd examples/05-openapi
bun main.ts
```

Then:

```bash
# Swagger UI
open http://localhost:3000/docs

# Raw spec
curl http://localhost:3000/docs/json | jq

# Hit a documented endpoint
curl http://localhost:3000/users/1
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Module, Controller, Get, Post, Param, Body, Inject, Injectable } from "@nexusts/core";
import { OpenAPIModule, OpenAPIService, ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nexusts/openapi";
import { z } from "zod";

const CreateUser = z.object({ name: z.string(), email: z.string().email() });

@ApiTags("Users")
@Controller("/users")
class UserController {
  @Get("/:id")
  @ApiOperation({ summary: "Get user by ID", operationId: "getUser" })
  @ApiParam({ name: "id", type: "integer" })
  @ApiResponse(200, { description: "User object" })
  @ApiResponse(404, { description: "Not found" })
  find(@Param("id") id: string) {
    return { id: Number(id), name: `User ${id}` };
  }

  @Post("/")
  @ApiOperation({ summary: "Create user", operationId: "createUser" })
  @ApiResponse(201, { description: "Created" })
  create(@Body() body: z.infer<typeof CreateUser>) {
    return { status: 201, body };
  }
}

@Module({
  imports: [OpenAPIModule.forRoot({
    info: { title: "Example API", version: "1.0.0" },
    path: "/docs",         // Scalar UI
    specPath: "/docs/json", // raw spec
  })],
  controllers: [UserController],
})
class AppModule {}

const app = new Application(AppModule);

// Feed registered routes into the OpenAPI spec generator.
// (In newer versions this is auto-wired by the framework.)
app.container.resolve(OpenAPIService.TOKEN).setRoutes(app.server.router.getRoutes());
OpenAPIModule.mount(app.server.app, app.container.resolve(OpenAPIService.TOKEN), {
  info: { title: "Example API", version: "1.0.0" },
  path: "/docs",
  specPath: "/docs/json",
});

await app.listen(3000);
```

## What you get

- `GET /docs` → Scalar UI (interactive API explorer)
- `GET /docs/json` → OpenAPI 3.1 JSON spec
- All controller metadata (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`) appears in the spec
- `setRoutes()` is called via `app.server.router.getRoutes()` which is built into the framework

## Adding request bodies

```ts
import { ApiBody, ApiParam } from "@nexusts/openapi";

@Post("/")
@ApiBody({ schema: CreateUser })
create(@Body() body: z.infer<typeof CreateUser>) { ... }
```

## Adding security

```ts
@ApiSecurity("bearer")
@Get("/me")
me(@Ctx() ctx) {
  const user = ctx.get("user");
  return { user };
}
```
