# @nexusts/limiter

> **NexusTS** — Bun-native fullstack framework

## Description

Rate limiting (fixed / sliding / token-bucket).

3 strategies × 2 storage backends (memory, Drizzle). Per-IP, per-user, per-API-key. For multi-pod deployments use the Drizzle backend.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core reflect-metadata zod hono
```

Then add this module only if you need it:

```bash
bun add @nexusts/limiter
```

## Peer dependencies

None. This module is fully self-contained.

## Usage

```typescript
import { /* public API */ } from "@nexusts/limiter";
```

See the [user guide](../../docs/user-guide/limiter.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
