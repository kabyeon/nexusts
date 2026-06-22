# GraphQL · `@nexusts/graphql`

> 한국어 버전: [`graphql.ko.md`](./graphql.ko.md)

Add a GraphQL endpoint to your NexusTS application with a single
`@Module({ imports: [...] })` entry. The framework ships an
SDL-first GraphQL adapter that mounts a `/graphql` endpoint, an
introspection-friendly playground, and an SDL debug view, all
backed by the standard `graphql` package.

## TL;DR

```bash
bun add graphql       # the only peer-dep you need
```

```ts
import { GraphQLModule } from "@nexusts/graphql";

@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: `
        type Query {
          hello(name: String!): String!
        }
      `,
      resolvers: {
        Query: {
          hello: (_p, args) => `Hello, ${args.name}!`,
        },
      },
    }),
  ],
})
class AppModule {}

const app = new Application(AppModule);
const g = app.container.resolve(GraphQLService) as GraphQLService;
await GraphQLModule.mount(app.server.app, g);
await app.listen(3000);
```

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ hello(name: \"world\") }"}'
# → {"data":{"hello":"Hello, world!"}}
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  @Module({ imports: [GraphQLModule.forRoot({...})] })        │
│                                                              │
│  ┌──────────────┐   buildSchema(typeDefs)                    │
│  │ typeDefs ──▶ │   attach resolver.resolve for each field     │
│  │              │   lazy on first request                     │
│  └──────────────┘                                            │
│                                                              │
│  ┌──────────────┐   POST /graphql                            │
│  │ resolvers ──▶│   GET  /graphql?query=...                    │
│  │              │   GET  /graphql/schema                      │
│  └──────────────┘   GET  /graphql (GraphiQL UI)               │
│                                                              │
│  ┌──────────────┐   per-request:                              │
│  │ context() ──▶│   { hono: c, state: {...} }                 │
│  │              │   passed as 4th arg to each resolver         │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

`GraphQLModule.forRoot()` does two things:

1. Registers a singleton `GraphQLService` in the DI container
   configured with your `typeDefs` / `resolvers` / `context()`.
2. Returns a configured module class ready to be put in
   `imports: [...]`.

`GraphQLModule.mount()` then wires the HTTP routes. The schema is
**not** built until the first request — and the result is cached on
the service.

## `forRoot(config)` reference

```ts
interface GraphQLConfig {
  /** SDL typeDefs (string or array of strings). */
  typeDefs?: string | string[];

  /** Resolver map: { [TypeName]: { [fieldName]: resolverFn } }. */
  resolvers?: ResolverMap;

  /** Endpoint config (default: { path: "/graphql", enableGet: true }). */
  endpoint?: { path: string; enableGet?: boolean };

  /** Playground UI: "graphiql" (default) or "none". */
  playground?: "graphiql" | "none";

  /** Per-request state factory. */
  context?: (c: Context) => Record<string, any> | Promise<Record<string, any>>;

  /** Expose the SDL at GET /graphql/schema (default: true). */
  exposeSchemaSDL?: boolean;

  /** Allow introspection (default: true). Set to false in prod. */
  introspection?: boolean;
}
```

## Resolvers

A resolver is a function with the standard graphql-js signature:

```ts
type ResolverFn<TResult, TArgs, TParent> = (
  parent: TParent,
  args: TArgs,
  context: GraphQLContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;
```

The `context` is a `GraphQLContext`:

```ts
interface GraphQLContext {
  hono: Context;                  // the Hono request context
  state: Record<string, any>;      // output of your context() factory
}
```

The `info` is a small stand-in for graphql-js's
`GraphQLResolveInfo` (carries `fieldName`, `parentType`,
`path`, etc.) — enough for the common cases (logging,
data-loader scopes, etc.).

## Injecting auth user / DB tx

Use the `context()` factory to make the request-scoped user, db
transaction, or anything else available to every resolver:

```ts
GraphQLModule.forRoot({
  typeDefs: `type Query { me: User! } type User { id: ID! email: String! }`,
  resolvers: {
    Query: {
      me: (_p, _a, ctx) => db.users.findById(ctx.state.userId),
    },
  },
  context: async (c) => {
    const userId = await readSessionCookie(c);
    return { userId };
  },
});
```

## Code-first via decorators (alpha)

In addition to the SDL-first approach, the module exports
`@Resolver`, `@Query`, `@Mutation`, `@Subscription`, and `@Arg`
decorators. **Currently these are alpha** — the schema is still
built from `typeDefs`, and decorator-discovered methods are not
yet auto-added to the SDL. The decorator API is reserved for a
v0.8 release where we'll synthesize SDL from the resolver
classes (similar to NestJS GraphQL's code-first mode).

For production, prefer SDL.

## Subscriptions

Define them in your typeDefs and resolve to an `AsyncIterable`:

```ts
typeDefs: `
  type Query  { hello: String! }
  type Subscription { tick: Int! }
`,
resolvers: {
  Query: { hello: () => "world" },
  Subscription: {
    tick: {
      subscribe: async function* () {
        let n = 0;
        while (true) {
          await new Promise((r) => setTimeout(r, 1000));
          yield { tick: ++n };
        }
      },
    },
  },
},
```

The framework forwards `subscribe` to graphql-js as-is.

## The peer-dep story

`@nexusts/graphql` does **not** bundle the `graphql`
package. It's a peer-dep you install yourself. The reason is
bundle size — a typical app uses REST or one of the other
NexusTS modules, not GraphQL, and we don't want the graphql
parser/executor in every bundle.

If you forget to install `graphql`, the first attempt to use
the service will throw:

```
[nexusts/graphql] The `graphql` package is required for execution.
Install it with `bun add graphql`. Original error: ...
```

## Smoke test

Every example's `bun main.ts` boots a process, mounts the
endpoints, and the smoke runner waits for the `Listening` log
line. The 32-graphql-hello example demonstrates this in
`tests/examples/smoke.test.ts`.

## What's missing in v0.7 (and planned for v0.8)

- **Full code-first via `@Resolver` / `@Query` / `@Mutation`.** The
  decorators are exported but the SDL synthesis is not wired up
  yet. Today, use SDL for non-trivial schemas.
- **DataLoader integration.** N+1 query batching is a common
  requirement; the integration point will be a per-resolver
  `loader` option.
- **Federation.** Apollo Federation v2 subgraph support is on the
  v0.8+ roadmap.
- **Persisted queries.** APQ support is in `graphql` 16+; we just
  need to plumb it through.

## See also

- [`../design/graphql.md`](../design/graphql.md) — architecture
  deep-dive (resolver lifecycle, schema build steps, peer-dep
  rationale).
- [`../../user-guide/database.md`](./database.md) — using
  Drizzle services as GraphQL resolvers.
- [`../../user-guide/auth.md`](./auth.md) — `AuthService` →
  GraphQL context pattern.
- [graphql-js docs](https://graphql.org/graphql-js/) — the
  underlying executor.
