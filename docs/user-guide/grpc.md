# @nexusts/grpc — gRPC integration

`@nexusts/grpc` lets you define gRPC services using TypeScript classes with
decorators, and serve them alongside your Hono HTTP routes. The same
module also exposes a typed client for calling gRPC services from
within your app.

## Why gRPC?

- **Strongly-typed contracts.** `.proto` files define the schema; the
  TypeScript client gets a matching shape.
- **HTTP/2 + binary.** Lower overhead than JSON-over-HTTP/1.1 for
  internal microservice traffic.
- **Streaming.** Server-streaming, client-streaming, and bidirectional
  streaming via `@GrpcServerStream`, `@GrpcClientStream`, and
  `@GrpcBidiStream` decorators — see [Streaming](#streaming).

## Install

```bash
bun add @grpc/grpc-js @grpc/proto-loader
```

Both are listed as **optional** peer dependencies in `@nexusts/grpc`'s
`package.json`. The framework imports them dynamically, so they're only
needed if you actually use the gRPC module.

## Quick start

### 1. Define a `.proto` file

```proto
// proto/user.proto
syntax = "proto3";
package user;

service UserService {
  rpc FindById (UserRequest) returns (UserResponse);
  rpc List (ListRequest) returns (ListResponse);
}

message UserRequest  { int32  id   = 1; }
message UserResponse { string name = 1; string email = 2; }
message ListRequest  { int32  page = 1; int32 pageSize = 2; }
message ListResponse { repeated UserResponse users = 1; }
```

### 2. Implement the service

```ts
// app/user/user.grpc.ts
import { Injectable, Inject } from "@@nexusts/core";
import { GrpcService, GrpcMethod } from "@@nexusts/grpc";

@Injectable()
@GrpcService("UserService")
export class UserServiceImpl {
  constructor(@Inject("DATABASE") private db: Database) {}

  @GrpcMethod("FindById")
  async findById(req: { id: number }) {
    const row = await this.db.user.findUnique({ where: { id: req.id } });
    return { name: row.name, email: row.email };
  }

  @GrpcMethod("List")
  async list(req: { page: number; pageSize: number }) {
    const rows = await this.db.user.findMany({
      skip: req.page * req.pageSize,
      take: req.pageSize,
    });
    return { users: rows };
  }
}
```

### 3. Register the module

```ts
// app/app.module.ts
import { Module } from "@@nexusts/core";
import { GrpcModule } from "@@nexusts/grpc";
import { UserServiceImpl } from "./user/user.grpc";

@Module({
  imports: [
    GrpcModule.forRoot({
      protoPath: "./proto/user.proto",
      services: [UserServiceImpl],
      port: 50051,
    }),
  ],
})
export class AppModule {}
```

### 4. Start the server

```ts
// app/main.ts
import { Application } from "@@nexusts/core";
import { GrpcService } from "@@nexusts/grpc";
import { AppModule } from "./app.module";

const app = new Application(AppModule);
const grpc = app.container.resolve(GrpcService);
await grpc.start();
// Server is now listening on 0.0.0.0:50051
```

## Typed client

`@nexusts/grpc` also builds typed clients for the services you register.
This is useful when one service in your app needs to call another:

```ts
type UserClient = {
  findById(req: { id: number }): Promise<{ name: string; email: string }>;
  list(req: { page: number; pageSize: number }): Promise<{ users: any[] }>;
};

const grpc = app.container.resolve(GrpcService);
const users = grpc.client<UserClient>("UserService", { url: "internal-user:50051" });
const u = await users.findById({ id: 1 });
```

The client wraps each method as a Promise-returning function. Method
names are converted to camelCase: `FindById` → `findById`.

## Lifecycle

```ts
const grpc = app.container.resolve(GrpcService);

// Bind to the configured port.
await grpc.start();   // → resolves when bound

// Graceful shutdown. Waits up to 1s for pending RPCs, then force-shuts down.
await grpc.stop();
```

If you set `port: 0` in the config, the OS picks a free port — useful
for tests. The actual port is available via `grpc.port` or the
`onBound` callback:

```ts
GrpcModule.forRoot({
  protoPath: "...",
  services: [UserServiceImpl],
  port: 0,
  onBound: (host, port) => console.log(`listening on ${host}:${port}`),
});
```

## Configuration

```ts
GrpcModule.forRoot({
  // Path(s) to .proto files. Can be a string or an array.
  protoPath: "./proto/user.proto",

  // Proto package. Walked as a dotted path through the loaded proto.
  // If your service is `service Greeter` in `package nexus.test;`,
  // leave this as "nexus.test".
  package: "user",

  // Service implementation classes. Each must be decorated with
  // `@GrpcService("ServiceName")`.
  services: [UserServiceImpl],

  // Port to bind. Default 50051. Set to 0 to let the OS pick a free port.
  port: 50051,

  // Host to bind. Default "0.0.0.0".
  host: "0.0.0.0",

  // Optional TLS. If set, the server uses HTTPS/2.
  tls: {
    cert: fs.readFileSync("server.crt"),
    key:  fs.readFileSync("server.key"),
  },

  // Called once the server is bound.
  onBound: (host, port) => {},
});
```

## Multiple services per server

You can register multiple proto files and multiple service
implementations on a single gRPC server. Each service keeps its own
typed client.

```ts
GrpcModule.forRoot({
  protoPath: ["./proto/user.proto", "./proto/order.proto"],
  services: [UserServiceImpl, OrderServiceImpl],
  port: 50051,
});
```

For this to work, your `.proto` files should either:

- All share the same `package` declaration, or
- Use the default (empty) package, or
- Specify a per-service `package` in the config (planned; for now all
  services must share the same `package`).

## DI integration

gRPC service implementations are full DI citizens. They can use
`@Inject(Token)` to receive other services, and they're resolved from
the same container as your HTTP controllers.

```ts
@Injectable()
@GrpcService("UserService")
export class UserServiceImpl {
  constructor(
    @Inject("DATABASE") private db: Database,
    @Inject(EventService) private events: EventService,
  ) {}

  @GrpcMethod("FindById")
  async findById(req: { id: number }) {
    const user = await this.db.user.findUnique({ where: { id: req.id } });
    this.events.emit("user.fetched", { id: req.id });
    return { name: user.name, email: user.email };
  }
}
```

Because the service impls are registered as providers in the gRPC
module, they're also available for resolution from the root container.

## Errors

If your handler throws or rejects, the error is forwarded to the gRPC
client as a `ServiceError` with status `INTERNAL` (code 13). To send
a specific status code, throw an error with a `code` property:

```ts
@GrpcMethod("FindById")
async findById(req: { id: number }) {
  const user = await this.db.user.findUnique({ where: { id: req.id } });
  if (!user) {
    const err = new Error(`user ${req.id} not found`) as Error & { code: number };
    err.code = 5; // gRPC status code: NOT_FOUND
    throw err;
  }
  return user;
}
```

## Streaming

`@nexusts/grpc` supports all three gRPC streaming patterns.

### Call pattern summary

| Decorator | Proto declaration | Server signature | Client return |
|-----------|-------------------|-----------------|---------------|
| `@GrpcMethod` | `rpc M(Req) returns (Res)` | `(req) => Promise<Res>` | `Promise<Res>` |
| `@GrpcServerStream` | `rpc M(Req) returns (stream Res)` | `(req) => AsyncIterable<Res>` | `AsyncIterable<Res>` |
| `@GrpcClientStream` | `rpc M(stream Req) returns (Res)` | `(reqs: AsyncIterable<Req>) => Promise<Res>` | `(src: AsyncIterable<Req>) => Promise<Res>` |
| `@GrpcBidiStream` | `rpc M(stream Req) returns (stream Res)` | `(reqs: AsyncIterable<Req>) => AsyncIterable<Res>` | `(src: AsyncIterable<Req>) => AsyncIterable<Res>` |

### Server streaming

The server receives a single request and streams multiple responses.

```proto
service NumberService {
  rpc ListNumbers (ListRequest) returns (stream NumberResponse);
}
message ListRequest     { int32 count = 1; }
message NumberResponse  { int32 n     = 1; }
```

```ts
@Injectable()
@GrpcService("NumberService")
class NumberServiceImpl {
  @GrpcServerStream("ListNumbers")
  async *listNumbers(req: { count: number }): AsyncIterable<{ n: number }> {
    for (let i = 0; i < req.count; i++) {
      yield { n: i };
    }
  }
}
```

Client usage:

```ts
const client = grpc.client<{
  listNumbers(req: { count: number }): AsyncIterable<{ n: number }>;
}>("NumberService");

for await (const { n } of client.listNumbers({ count: 5 })) {
  console.log(n); // 0, 1, 2, 3, 4
}
```

### Client streaming

The client streams multiple messages and the server returns a single response.

```proto
service SumService {
  rpc Sum (stream NumberRequest) returns (SumResponse);
}
message NumberRequest { int32 n     = 1; }
message SumResponse   { int32 total = 1; }
```

```ts
@Injectable()
@GrpcService("SumService")
class SumServiceImpl {
  @GrpcClientStream("Sum")
  async sum(reqs: AsyncIterable<{ n: number }>): Promise<{ total: number }> {
    let total = 0;
    for await (const { n } of reqs) total += n;
    return { total };
  }
}
```

Client usage:

```ts
const client = grpc.client<{
  sum(): (src: AsyncIterable<{ n: number }>) => Promise<{ total: number }>;
}>("SumService");

const result = await client.sum()(async function* () {
  yield { n: 1 }; yield { n: 2 }; yield { n: 3 };
}());
// → { total: 6 }
```

### Bidirectional streaming

Both sides stream simultaneously.

```proto
service EchoService {
  rpc Echo (stream EchoRequest) returns (stream EchoResponse);
}
message EchoRequest  { string message = 1; }
message EchoResponse { string reply   = 1; }
```

```ts
@Injectable()
@GrpcService("EchoService")
class EchoServiceImpl {
  @GrpcBidiStream("Echo")
  async *echo(reqs: AsyncIterable<{ message: string }>): AsyncIterable<{ reply: string }> {
    for await (const { message } of reqs) {
      yield { reply: `Echo: ${message}` };
    }
  }
}
```

Full example: [`examples/34-grpc-streaming/main.ts`](../../examples/34-grpc-streaming/main.ts)

---

## Limitations

- **Reflection-based.** No codegen step; `.proto` files are loaded at
  runtime via `@grpc/proto-loader`. Trade-off: zero build step, but
  slightly slower cold start.
- **HTTP/2 required.** gRPC mandates HTTP/2. The server runs on a
  separate port from your Hono HTTP/1.1 routes.

## API reference

### `@GrpcService(name: string)` — class decorator

Marks a class as a gRPC service implementation. The `name` must match
a `service` declaration in the `.proto` file.

```ts
@GrpcService("UserService")
class UserServiceImpl { ... }
```

### `@GrpcMethod(name: string)` — method decorator

Binds a class method to a gRPC method declared in the `.proto` file.
The `name` must match an `rpc` declaration under the service.

```ts
@GrpcMethod("FindById")
async findById(req: { id: number }) { ... }
```

The JS method name doesn't have to match the proto name. The
decorator stores a map of `jsName → protoName`, so `findById` can map
to `FindById`.

### `GrpcService` — main service

```ts
const grpc = app.container.resolve(GrpcService);

await grpc.start();          // bind to port
await grpc.stop();           // graceful shutdown (1s timeout, then force)
grpc.isRunning;              // true after start()
grpc.port;                   // actual bound port (after start())
grpc.host;                   // actual bound host

const users = grpc.client<UserClient>("UserService", {
  url: "internal:50051",     // optional, defaults to 127.0.0.1:<grpc.port>
  tls: false,                // optional, default false
});
```

### `GrpcModule.forRoot(config)` — DI module

```ts
GrpcModule.forRoot({
  protoPath: string | string[];
  package?: string;          // default ""
  services: Array<new (...a: any[]) => any>;
  port?: number;             // default 50051
  host?: string;             // default "0.0.0.0"
  tls?: { cert: Buffer; key: Buffer | Buffer[] };
  onBound?: (host: string, port: number) => void;
});
```
