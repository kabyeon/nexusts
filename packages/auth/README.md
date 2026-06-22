# @nexusts/auth

> **NexusTS** — Bun-native fullstack framework

## Description

Authentication via better-auth integration.

Provides authentication via better-auth. Brings the standard adapter so better-auth's API stays consistent with the rest of NexusTS (DI / decorator model). Type-safe users via @CurrentUser, sessions integrated with the framework's session module.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core reflect-metadata zod hono
```

Then add this module only if you need it:

```bash
bun add @nexusts/auth
```

## Peer dependencies

```bash
bun add better-auth
```

Required by this module. Without them the module loads but its public methods throw a clear error pointing to this install command on first call.

## Usage

```typescript
import { /* public API */ } from "@nexusts/auth";
```

See the [user guide](../../docs/user-guide/auth.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
