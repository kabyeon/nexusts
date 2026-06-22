# @nexusts/mail

> **NexusTS** — Bun-native fullstack framework

## Description

Outbound email (SMTP / File / Null transports).

Three transports: SMTP, file (writes to disk for testing), null (no-op). Optional MJML rendering for HTML emails.

## Install

This module is part of the NexusTS monorepo. Each module is published as its own npm package under the `@nexusts/` scope.

Most apps start with just the core:

```bash
bun add @nexusts/core reflect-metadata zod hono
```

Then add this module only if you need it:

```bash
bun add @nexusts/mail
```

## Peer dependencies

None. This module is fully self-contained.

## Usage

```typescript
import { /* public API */ } from "@nexusts/mail";
```

See the [user guide](../../docs/user-guide/mail.md) and the [example app](../../examples/) for a working demo.

## License

MIT — see the root [LICENSE](../../LICENSE).
