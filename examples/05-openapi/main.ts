import "reflect-metadata";
import {
  Application, Module, Controller, Get, Post, Param, Body, Inject, Injectable,
} from "@nexusts/core";
import {
  OpenAPIModule, OpenAPIService,
  ApiTags, ApiOperation, ApiResponse, ApiParam,
} from "@nexusts/openapi";
import { z } from "zod";

/**
 * 05-openapi — OpenAPI 3.1 spec + Scalar UI from controller decorators.
 *
 *   GET  /docs         → Scalar interactive UI
 *   GET  /docs/json    → raw spec
 *   GET  /users/:id    → documented endpoint
 *   POST /users        → documented endpoint
 *
 *   Run: bun main.ts
 *   Then: open http://localhost:3000/docs
 */

const CreateUser = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

@ApiTags("Users")
@Controller("/users")
class UserController {
  @Get("/:id")
  @ApiOperation({ summary: "Get user by ID", operationId: "getUser" })
  @ApiParam({ name: "id", type: "integer" })
  @ApiResponse(200, { description: "User object" })
  @ApiResponse(404, { description: "User not found" })
  find(@Param("id") id: string) {
    return { id: Number(id), name: `User ${id}` };
  }

  @Post("/")
  @ApiOperation({ summary: "Create user", operationId: "createUser" })
  @ApiResponse(201, { description: "User created" })
  @ApiResponse(400, { description: "Invalid input" })
  create(@Body() body: z.infer<typeof CreateUser>) {
    // In a real app: persist to DB, then return { status: 201, body: created }
    return { status: 201, body };
  }
}

@Module({
  imports: [
    OpenAPIModule.forRoot({
      info: { title: "Example API", version: "1.0.0", description: "OpenAPI demo" },
      path: "/docs",
      specPath: "/docs/json",
    }),
  ],
  controllers: [UserController],
})
class AppModule {}

const app = new Application(AppModule);

// Feed registered routes to the spec generator.
const openapi = app.container.resolve(OpenAPIService.TOKEN) as OpenAPIService;
openapi.setRoutes(app.server.router.getRoutes());

// Mount Scalar UI + JSON spec endpoint on the Hono app.
OpenAPIModule.mount(app.server.app, openapi, {
  info: { title: "Example API", version: "1.0.0" },
  path: "/docs",
  specPath: "/docs/json",
});

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);