# 01 · Basic MVC

The minimal NexusTS application — a single `HelloController` with
Nest-style class decorators.

## What it shows

- `@Controller('/')`, `@Get('/')`, `@Get('/json')` decorators
- `Application` class and `app.listen()`
- Returning plain objects, JSON, and plain text

## How to run

```bash
cd examples/01-basic-mvc
bun --hot main.ts
```

Then:

```bash
curl http://localhost:3000/        # → "Hello from NexusTS!"
curl http://localhost:3000/json    # → {"message":"Hello","framework":"NexusTS"}
curl http://localhost:3000/users/42 # → {"id":42,"name":"User #42"}
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Controller, Get, Param } from "@nexusts/core";

@Controller("/")
class HelloController {
  @Get("/")
  index() {
    return "Hello from NexusTS!";
  }

  @Get("/json")
  json() {
    return { message: "Hello", framework: "NexusTS" };
  }

  @Get("/users/:id")
  user(@Param("id") id: string) {
    return { id: Number(id), name: `User #${id}` };
  }
}

const app = new Application(HelloController);
await app.listen(3000);
```

## Notes

- No DI, no modules, no database — just the bare minimum
- `Application` accepts a **controller class** directly when you don't
  need a module tree
- `@Param('id')` automatically parses the `:id` URL segment as `string`
- Return values are auto-serialized:
  - `string` → `text/html`
  - `object` → `application/json`
