# @nexusts/ws

> **NexusTS** — Bun-native fullstack framework

## Description

WebSockets (Bun native, Node fallback via ws).

@WebSocketGateway(path) / @OnWebSocketMessage() decorators. Rooms, broadcast. Runtime auto-detected (Bun primary; ws as optional peer dep on Node).

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core
```

Then add this module only if you need it:

```bash
bun add @nexusts/ws
```

## Peer dependencies

```bash
bun add ws
```

- **`ws`** ^8.18.0 — Required on Node.js. On Bun the WebSocket runtime is built in, so you can skip this dependency.

Without them the module loads but its public methods throw a clear error pointing to this install command on first call.

## Usage

```typescript
import { /* public API */ } from "@nexusts/ws";
```

See the [user guide](../../docs/user-guide/ws.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
