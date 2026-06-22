# @nexusts/session

> **NexusTS** — Bun-native fullstack framework

## Description

Cookie / Memory / Drizzle sessions.

3 backends. Cookie is HMAC-signed and stateless. Memory is single-process. Drizzle is shared across pods. Built-in `sessionMiddleware()` exposes `getSession(c)` and `setSession(c, data)`.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core reflect-metadata zod hono
```

Then add this module only if you need it:

```bash
bun add @nexusts/session
```

## Peer dependencies

None. This module is fully self-contained.

## Usage

```typescript
import { /* public API */ } from "@nexusts/session";
```

See the [user guide](../../docs/user-guide/session.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
