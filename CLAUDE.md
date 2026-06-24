# NexusTS — Claude Code Guide

This project uses **Bun** (≥ 1.3), **TypeScript**, **Hono**, **Drizzle ORM**.

## Quick start

```bash
bun install
bun run build           # build all packages
bun run test            # run tests
bun run examples:smoke  # smoke tests (69)
```

## Key conventions

- **Legacy decorators** (`experimentalDecorators: true`) — not TC39 stage-3.
- **32 independent packages** under `@nexusts/*` — each is its own bundle entry.
- **Docs must be written in BOTH English (`.md`) and Korean (`.ko.md`)** simultaneously.

## Full reference

See [`AGENTS.md`](./AGENTS.md) for the complete module-author guide,
decorator conventions, 7-step module addition workflow, and build pipeline details.
