# WebSocket Module — design

> 한국어 버전: [`ws.ko.md`](./ws.ko.md)

This document explains the architecture of `@nexusts/ws`:
the gateway decorator pattern, runtime adapters (Bun vs Node),
room-based broadcasting, and lifecycle hooks.

## Goals

1. **Single API, two runtimes.** Same `@WebSocketGateway`, same
   lifecycle decorators, same broadcasting API — works on Bun
   (primary, via `Bun.serve` websocket) and Node.js (via the `ws`
   package).
2. **Gateway pattern.** Decorate a class with `@WebSocketGateway(path)`
   and the framework handles upgrade, lifecycle, and message routing.
3. **Room-based broadcasting.** `joinRoom`, `leaveRoom`, `broadcastToRoom`
   — standard WebSocket room mechanics without external dependencies.
4. **Lifecycle hooks.** `@OnWebSocketOpen`, `@OnWebSocketMessage`,
   `@OnWebSocketClose`, `@OnWebSocketError` — declarative event
   handlers.
5. **DI integration.** Gateways are regular `@Injectable()` services
   with full DI support (inject other services, use config, etc.).

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  @WebSocketGateway('/chat')                            │
│  class ChatGateway {                                   │
│    @OnWebSocketOpen() onOpen(client) { ... }           │
│    @OnWebSocketMessage() onMsg(client, data) { ... }   │
│  }                                                     │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              WebSocketService                           │
│                                                        │
│  joinRoom(client, room)                                │
│  leaveRoom(client, room)                               │
│  broadcastToRoom(room, data)                           │
│  broadcastAll(data)                                    │
│  clientsInRoom(room)                                   │
│                                                        │
│  Internal: Map<roomId, Set<clientId>>                  │
│            Map<clientId, Set<roomId>>                   │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              Runtime Adapter                            │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  BunWsAdapter    │  │  NodeWsAdapter   │            │
│  │                  │  │                  │            │
│  │  Bun.serve WS    │  │  ws (npm)        │            │
│  │  detectRuntime   │  │  multi-server    │            │
│  │  = 'bun'         │  │  = 'node'        │            │
│  └──────────────────┘  └──────────────────┘            │
└────────────────────────────────────────────────────────┘
```

## Runtime detection

`detectRuntime()` uses feature detection:

```ts
function detectRuntime(): WsRuntime {
  if (typeof Bun !== 'undefined' && Bun.websocket) return 'bun';
  if (typeof WebSocketServer !== 'undefined') return 'node';
  return 'bun'; // default
}
```

### Bun adapter

Uses Hono's `upgradeWebSocket()` helper and `Bun.serve()`'s native
`websocket` handler. The adapter:

1. Intercepts WebSocket upgrade requests in the Hono middleware.
2. Returns the `websocket` config object for `Bun.serve()`.
3. Routes lifecycle events to the gateway's decorated methods.

### Node adapter

Uses the `ws` npm package's `WebSocketServer`. The adapter:

1. Listens for `upgrade` events on the Node HTTP server.
2. Handles `connection`, `message`, `close`, and `error` events.
3. Routes them to the gateway.

Node requires an additional peer dependency: `bun add ws`.

## Gateway lifecycle

```
1. Client connects → upgrade request
2. Server upgrades → @OnWebSocketOpen(client)
3. Client sends → @OnWebSocketMessage(client, data)
4. Client disconnects → @OnWebSocketClose(client)
5. Error occurs → @OnWebSocketError(client, error)
```

Each gateway method receives a `WebSocketClient` object:

```ts
interface WebSocketClient {
  id: string;            // Unique connection ID
  send(data: any): void; // Send JSON or raw data
  close(): void;         // Terminate the connection
  readyState: number;    // CONNECTING, OPEN, CLOSING, CLOSED
}
```

## Room management

Rooms are tracked in-process with bidirectional maps:

- `rooms: Map<roomId, Set<clientId>>` — who is in each room
- `clientRooms: Map<clientId, Set<roomId>>` — which rooms a client is in

On disconnect, `leaveAllRooms(client)` is called automatically to
clean up both maps.

```ts
const ws = container.resolve(WebSocketService);

// Join / leave
ws.joinRoom(client, 'lobby');
ws.leaveRoom(client, 'lobby');

// Broadcast
ws.broadcastToRoom('lobby', { type: 'chat', text: 'Hello!' });
ws.broadcastAll({ type: 'announcement', text: 'Server restarting' });

// Inspect
const clients = ws.clientsInRoom('lobby'); // WebSocketClient[]
```

## Message serialization

All messages are serialized as JSON by default. The `send()` method
accepts any value that can be `JSON.stringify()`'d.

Future: support for binary frames (`ArrayBuffer`, `Buffer`) via an
opt-in `binary` flag.

## DI integration

```
ApplicationContainer
  └── ConfiguredWsModule
        ├── WebSocketService
        ├── WEBSOCKET_SERVICE_TOKEN (Symbol alias)
        └── Gateway classes (injected as providers)
```

Gateways are registered as DI providers via `WebSocketModule.forRoot()`.
The module resolves each gateway instance and reads its metadata
(`getGatewayPath`, `getLifecycleHandlers`) during `install()`.

## Metadata flow

The decorators store metadata via `Reflect.defineMetadata`:

| Decorator | Stores |
|-----------|--------|
| `@WebSocketGateway(path)` | Path on the class |
| `@OnWebSocketOpen()` | Method key in `onOpen` array |
| `@OnWebSocketMessage()` | Method key in `onMessage` array |
| `@OnWebSocketClose()` | Method key in `onClose` array |
| `@OnWebSocketError()` | Method key in `onError` array |

`getLifecycleHandlers(instance)` reads all four arrays and returns a
`WsLifecycleHandlers` object with the bound methods.

## Future work

- **Binary frames** — support for `ArrayBuffer`, `Blob`, and streaming.
- **Namespaced rooms** — scoped per gateway path (e.g., `/chat/lobby`
  vs `/game/lobby`).
- **Auto-reconnect** — client-side helper for resiliency.
- **Rate limiting per connection** — integrate with `nexusts/limiter`
  for per-WebSocket message rate limits.
- **Statistics** — active connections, messages/sec, room sizes.

## See also

- [`../user-guide/ws.md`](../user-guide/ws.md) — user guide
- [`../design/sse.md`](../design/sse.md) — Server-Sent Events (alternative to WebSockets)
