# 02 · Three Routing Styles

NexusTS supports three ways to define routes, mirroring NestJS,
AdonisJS, and Hono.

## Styles

| Style | Pattern | When to use |
|-------|---------|------------|
| **Nest** | `@Controller('/')` + method decorators | Class-based, DI-friendly |
| **Adonis** | `router.add(method, path, controller, action)` | Less boilerplate, single class |
| **Functional** | `router.raw(method, path, handler)` | Closest to the metal |

## How to run

```bash
cd examples/02-routing-styles
bun main.ts
```

Then:

```bash
curl http://localhost:3000/              # → Nest-style
curl http://localhost:3000/adonis        # → Adonis-style
curl http://localhost:3000/hello/bob    # → Functional
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Controller, Get, Param } from "@nexusts/core";

// ---------- Style 1: Nest-style ----------
@Controller("/")
class NestStyle {
  @Get("/")
  root() {
    return { style: "nest", message: "Class decorators" };
  }
}

// ---------- Style 2: Adonis-style ----------
@Controller("/adonis")
class AdonisStyle {
  list() {
    return { style: "adonis", message: "router.add(method, path, controller, action)" };
  }
}

// ---------- Style 3: Functional ----------
// Just plain Hono handlers — see Hono docs for request/response API.
```

```ts
// wiring in main()
const app = new Application(NestStyle);

// 1. Nest-style — controllers are passed at construction.
app.server.router.registerController(NestStyle);

// 2. Adonis-style — register a controller + method name
app.server.router.add("GET", "/adonis", AdonisStyle, "list");

// 3. Functional — pass a raw Hono handler
app.server.router.raw("GET", "/hello/:name", (c) =>
  c.json({ style: "functional", message: `Hello, ${c.req.param("name")}!` })
);
```

## When to use each

- **Nest**: You want DI (`@Inject`), request-scoped providers, OpenAPI decorators
- **Adonis**: One controller with many methods, less ceremony
- **Functional**: Middleware-style endpoints, Hono-native code, dynamic registration at boot
