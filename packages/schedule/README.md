# @nexusts/schedule

> **NexusTS** — Bun-native fullstack framework

## Description

Cron scheduling (@Cron / @Interval / @Timeout).

In-tree cron parser (no `cron` / `node-cron` peer dep). Decorator-based.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core
```

Then add this module only if you need it:

```bash
bun add @nexusts/schedule
```

## Peer dependencies

**None.** No external dependencies. In-tree cron parser; no `cron` or `node-cron` needed.

## Usage

```typescript
import { /* public API */ } from "@nexusts/schedule";
```

See the [user guide](../../docs/user-guide/schedule.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
