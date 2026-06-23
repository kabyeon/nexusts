# @nexusts/cache

> **NexusTS** — Bun-native fullstack framework

## Description

Application cache (memory / Drizzle backends).

Tagged caching with LRU eviction (memory) or shared Drizzle storage. Group keys by tag and invalidate them together.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core
```

Then add this module only if you need it:

```bash
bun add @nexusts/cache
```

## Peer dependencies

**None.** No external dependencies. The memory and Drizzle backends are bundled; the Drizzle backend uses `@nexusts/drizzle` if installed.

## Usage

```typescript
import { /* public API */ } from "@nexusts/cache";
```

See the [user guide](../../docs/user-guide/cache.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
