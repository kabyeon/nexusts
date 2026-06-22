# @nexusts/core

> **NexusTS Core** — Bun-native fullstack framework. Install this and you have a working MVC + DI + routing + validation stack.

## What's included

| Capability | Description |
| ---------- | ----------- |
| **MVC** | `@Controller`, `@Module`, `@Injectable`, `@Inject` |
| **DI** | Constructor injection with singleton / transient / request scopes |
| **Routing** | Three styles: Nest decorators, Adonis-style router, Hono functional |
| **Validation** | `@Validate()` with Zod schemas, automatic 422 responses |
| **View engines** | Rendu (default), Edge, Eta, Inertia.js v2 (React + Vue) |
| **CLI** | `nx` command runner: `new`, `init`, `make:*`, `db:*`, `repl` |
| **Hono server** | Underlying HTTP server (Bun / Node / Cloudflare Workers) |

## Install

```bash
bun add @nexusts/core reflect-metadata zod hono
npx @nexusts/core init
```

That's it. No additional dependencies required to get a working app.

## Optional modules

`@nexusts/core` is enough for most apps. Add individual `@nexusts/*` packages
as you need them — each is a separately-installed npm package with its own
peer dependencies.

| Module | What it adds | Extra install |
| ------ | ------------ | ------------- |
| `@nexusts/auth` | better-auth integration | `bun add better-auth` |
| `@nexusts/graphql` | SDL-first GraphQL | `bun add graphql` |
| `@nexusts/drizzle` | Drizzle ORM (default) | `bun add drizzle-orm` + driver |
| `@nexusts/queue` | Background jobs (BullMQ) | `bun add bullmq ioredis` |
| `@nexusts/redis` | Redis client | `bun add ioredis` |
| `@nexusts/tracing` | OpenTelemetry | `bun add @opentelemetry/api` + SDK |
| `@nexusts/metrics` | Prometheus | _(none)_ |
| `@nexusts/ws` | WebSockets | `bun add ws` (Node only) |
| `@nexusts/grpc` | gRPC server + client | _(none)_ |
| `@nexusts/grpc` | gRPC server + client | _(none)_ |
| ... | ... | ... |

See [`docs/user-guide/`](../../docs/user-guide/) for the full module list.

## Usage

```typescript
import { Application, Controller, Get, Module } from "@nexusts/core";

@Controller("/")
class HelloController {
  @Get("/")
  index() {
    return { message: "Hello from NexusTS!" };
  }
}

@Module({
  controllers: [HelloController],
})
class AppModule {}

const app = new Application(AppModule);
export default app;
```

## License

MIT — see the root [LICENSE](../../LICENSE).
