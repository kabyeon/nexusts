# @nexusts/view

> **NexusTS** — Bun-native fullstack framework

## Description

View engines (Rendu, Edge, Eta) + Inertia.js v2 adapter.

3 engines: Rendu (default, every runtime), Edge (Adonis-style .edge), Eta (EJS-style .eta). Inertia v2 adapter for React + Vue SPAs and SSR.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core
```

Then add this module only if you need it:

```bash
bun add @nexusts/view
```

## Peer dependencies

**None.** No external dependencies for Rendu / Edge / Eta. Inertia.js React requires `react` and `@inertiajs/react`; Inertia.js Vue requires `vue` and `@inertiajs/vue3`.

## Usage

```typescript
import { /* public API */ } from "@nexusts/view";
```

See the [user guide](../../docs/user-guide/view.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
