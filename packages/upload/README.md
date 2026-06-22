# @nexusts/upload

> **NexusTS** — Bun-native fullstack framework

## Description

Multipart file upload with validation.

@Upload() / @UploadedFile() decorators. Size limits, MIME validation, count limits. Stores through the configured drive driver.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core reflect-metadata zod hono
```

Then add this module only if you need it:

```bash
bun add @nexusts/upload
```

## Peer dependencies

None. This module is fully self-contained.

## Usage

```typescript
import { /* public API */ } from "@nexusts/upload";
```

See the [user guide](../../docs/user-guide/upload.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
