# 32 · GraphQL (Hello World)

Minimal GraphQL endpoint with `@nexusts/graphql`. Demonstrates
SDL-first schema definition, hand-written resolver maps, the
no-deps GraphiQL playground, and the `context()` factory for
injecting per-request state.

## What it shows

- `GraphQLModule.forRoot({ typeDefs, resolvers })` for SDL-first
  schema.
- `GraphQLService.ensureSchema()` — lazy build, cached.
- `GraphQLModule.mount(app, svc)` — wires `POST /graphql`,
  `GET /graphql?query=...`, `GET /graphql/schema`, and the
  GraphiQL UI onto a Hono app.
- `context()` factory — produces per-request `state` (the Hono
  context is automatically provided as `ctx.hono`).

## How to run

```bash
cd examples/32-graphql-hello
bun add graphql                    # graphql is an optional peer-dep
bun main.ts
```

Then in another terminal:

```bash
# Query
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ hello(name: \"world\") }"}'

# Variables + arithmetic
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query Add($x: Int!, $y: Int!) { add(a: $x, b: $y) }","variables":{"x":2,"y":40}}'

# Context-aware resolver
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ whoami }"}'

# Schema as SDL
curl http://localhost:3000/graphql/schema

# GraphiQL playground in a browser
open http://localhost:3000/graphql
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Get } from "@nexusts/core";
import { GraphQLModule, GraphQLService } from "@nexusts/graphql";

@Controller("/")
class HomeController {
  @Get("/")
  home() {
    return { graphql: "POST /graphql with { query: '{ hello }' }" };
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: `
        type Query {
          hello(name: String!): String!
          whoami: String!
          add(a: Int!, b: Int!): Int!
        }
      `,
      resolvers: {
        Query: {
          hello: (_p, args) => `Hello, ${args.name}!`,
          whoami: (_p, _a, ctx) => ctx.state.user,
          add: (_p, args) => args.a + args.b,
        },
      },
      context: () => ({ user: "alice" }),
    }),
  ],
  controllers: [HomeController],
})
class AppModule {}

const app = new Application(AppModule);
const g = app.container.resolve(GraphQLService) as GraphQLService;
await GraphQLModule.mount(app.server.app, g);
await app.listen(3000);
```

## How it works

1. `GraphQLModule.forRoot(config)` registers a singleton
   `GraphQLService` in the DI container, built from `config`.
2. `GraphQLService.ensureSchema()` is called once on first request.
   It calls `buildSchema(typeDefs)` from the `graphql` peer-dep, then
   attaches each entry in the `resolvers` map to the corresponding
   field's `resolve` function.
3. `GraphQLModule.mount()` wires four routes onto your Hono app:
   - `POST /graphql` — runs the query / mutation.
   - `GET /graphql?query=...` — pre-baked query (for caching or
     browser-shared links).
   - `GET /graphql/schema` — the raw SDL.
   - `GET /graphql` (no query) — the lightweight in-bundle GraphiQL
     playground. Set `playground: "none"` to disable.

## The `graphql` peer-dep

`@nexusts/graphql` requires the `graphql` package at runtime
(it does NOT bundle it). Install with:

```bash
bun add graphql
```

If you forget, the first GraphQL request will throw a clear error
saying `bun add graphql` is the fix.

## What this example doesn't show

- **Code-first via `@Resolver` / `@Query` / `@Mutation` decorators.**
  The framework exposes those decorators, but the wiring between
  decorator-discovered fields and SDL is intentionally light in v0.7.
  For now, prefer SDL for non-trivial schemas.
- **Subscriptions.** Defined in the public API surface
  (`@Subscription()`) but not exercised here; the executor forwards
  to graphql-js, so it works as long as your resolver returns an
  `AsyncIterable`.
- **Federation / DataLoader / persisted queries.** All future work
  (see `docs/analysis/nestjs-comparison.md` for the roadmap).

## Files

```
32-graphql-hello/
├── main.ts             # server (SDL + resolver map + mount)
├── public/             # (no static assets in this example)
└── README.md
```
