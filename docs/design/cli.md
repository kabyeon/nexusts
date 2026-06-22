# CLI Module — design

> 한국어 버전: [`cli.ko.md`](./cli.ko.md)

This document explains the architecture of `@nexusts/cli`:
the `nx` command runner, scaffold generators, code templates, the
config loader, and the REPL.

## Goals

1. **Adonis ACE-style command runner.** `nx make:controller User`,
   `nx make:crud Post`, `nx route:list`, `nx info` — familiar
   conventions for Laravel/Adonis developers.
2. **Scaffold generator.** `nx new my-app` creates a complete project
   with configurable style (nest, functional, adonis), view engine
   (rendu, edge, inertia), and ORM (drizzle, prisma, kysely).
3. **Code generation.** `nx make:*` commands generate boilerplate
   files (controllers, services, modules, models, migrations, etc.)
   with consistent templates.
4. **Project introspection.** `nx info` prints the runtime environment;
   `nx route:list` prints registered HTTP routes; `nx config` prints
   the resolved `nx.config.ts`.
5. **REPL.** `nx repl` opens an interactive TypeScript REPL with the
   application's DI container available.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  nx CLI (cli/index.ts)                       │
│                                                             │
│  parseArgs(process.argv.slice(2))                           │
│  findCommand(parsed.command)                                │
│  loadConfig(cwd)  →  NxConfig                               │
│  command.run({ cwd, config, positional, flags })            │
└─────────────────────────────────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
┌────────────────┐ ┌──────────┐ ┌──────────────┐
│  Core utilities│ │ Command  │ │  Templates   │
│                │ │ Registry │ │              │
│  args.ts       │ │          │ │ controller/  │
│  config.ts     │ │ commands/│ │ crud/        │
│  fs.ts         │ │ index.ts │ │ model/       │
│  logger.ts     │ │          │ │ migration/   │
│  prompts.ts    │ │          │ │ project/     │
│  template.ts   │ │          │ │ service/     │
│                │ │          │ │ module/      │
│                │ │          │ │ ...          │
└────────────────┘ └──────────┘ └──────────────┘
```

## Argument parsing

`parseArgs()` in `core/args.ts` handles:

- **Flags**: `--name value`, `-n value`, `--flag` (boolean),
  `--no-flag` (negation), `--flag=a,b` (array).
- **Positional**: all non-flag arguments in order.
- **Commands**: the first positional that matches a registered command
  (or `help` as fallback).

```ts
// nx make:controller User --no-views --resource
// → { command: "make:controller", positional: ["User"], flags: { views: false, resource: true } }
```

## Config loading

`loadConfig(cwd)` searches for a config file in order:

1. `nx.config.ts` (primary — TypeScript, loaded via Bun/tsx)
2. `nx.config.js` (fallback)
3. `.nxrc.json` (JSON fallback — simpler, no TS)

The config is parsed and validated against a `NxConfig` type:

```ts
interface NxConfig {
  style?: 'nest' | 'functional' | 'adonis';
  view?: 'rendu' | 'edge' | 'inertia' | 'eta';
  orm?: 'drizzle' | 'prisma' | 'kysely' | 'none';
  auth?: { /* ...auth config... */ };
  session?: { /* ...session config... */ };
  redis?: { /* ...redis config... */ };
  // ...
}
```

Config values are merged with defaults and override CLI flags when
both are present (CLI flags win).

## Template engine

The template system in `core/template.ts` renders files from the
`templates/` directory. It uses:

- **EJS-style syntax**: `<%= name %>` for values, `<% if (...) { %>` for
  conditionals.
- **Compiled per command**: templates are loaded, rendered with the
  command's context variables, and written to the target path.
- **Style-aware**: controller templates exist in three variants —
  `nest.ts`, `functional.ts`, and `adonis.ts` — selected by the
  project's configured style.

```ts
// template.render('controller/nest.ts', {
//   name: 'User',
//   path: 'users',
//   resource: true,
// })
```

Template files are embedded in the published package (bundled by
`bun build`).

## Commands

### Scaffold

| Command | Description |
|---------|-------------|
| `nx new <name>` | Create a new project from scratch |
| `nx init` | Initialize nexus in an existing project |

### Code generation (make:*)

| Command | Aliases | Generates |
|---------|---------|-----------|
| `nx make:controller <name>` | `mc` | Controller file |
| `nx make:service <name>` | `ms` | Injectable service |
| `nx make:module <name>` | `mm` | Module class |
| `nx make:model <name>` | `mmodel` | Model + decorators |
| `nx make:migration <name>` | `mmigrate` | Migration file |
| `nx make:crud <name>` | `mcrud` | Full CRUD (controller + service + module + dto + test) |
| `nx make:middleware <name>` | `mmw` | Hono middleware |
| `nx make:validator <name>` | `mv` | Zod validator |
| `nx make:auth <name>` | `mauth` | Auth module boilerplate |
| `nx make:queue <name>` | `mq` | Queue worker |
| `nx make:schedule <name>` | `msched` | Cron job |
| `nx make:listener <name>` | `ml` | Event listener |
| `nx make:session <name>` | `msess` | Session setup |

### Database

| Command | Description |
|---------|-------------|
| `nx db:migrate` | Run pending migrations |
| `nx db:generate` | Generate migration from schema diff |
| `nx db:seed` | Run seed files |

### Introspection

| Command | Description |
|---------|-------------|
| `nx info` | Print runtime info (Bun/Node version, framework version, config) |
| `nx route:list` | Print all registered HTTP routes |
| `nx config` | Print resolved `nx.config.ts` |
| `nx repl` | Open interactive TS REPL |

## REPL (`nx repl`)

The REPL loads the application module, resolves the DI container, and
drops into an interactive TypeScript shell (using Bun's built-in
`Bun.repl()` or Node's `node:repl`).

Available in the REPL context:

| Variable | Value |
|----------|-------|
| `app` | `Application` instance |
| `container` | `app.container` (DI container) |
| `resolve<T>(token)` | Shorthand for `container.resolve<T>(token)` |
| `config` | The loaded `NxConfig` |

## Cross-runtime

The CLI runs on both Bun and Node.js:

- **Bun**: primary runtime. Uses `Bun.write()`, `Bun.file()` for fast
  I/O. The REPL uses `Bun.repl()`.
- **Node.js**: falls back to `fs/promises` and Node's built-in `repl`.
  TypeScript parsing requires `tsx` or `ts-node` to load `nx.config.ts`.

Runtime detection is the same pattern as `nexusts/redis` and
`nexusts/ws`:

```ts
const isBun = typeof Bun !== 'undefined';
```

## Future work

- **`nx generate <type> <name>`** — unified generator command
  (Adonis-style) as an alternative to `nx make:*`.
- **`nx serve`** — development server with file watching + auto-reload
  (currently users run `bun run dev`).
- **`nx test`** — run tests with configuration auto-detection.
- **Plugin generators** — support for third-party generator packages
  via the `nx.config.ts` plugins array.
- **Interactive `nx new`** — TUI prompts for all options (style, view,
  ORM, auth, session, etc.) with sensible defaults.

## See also

- [`../user-guide/cli.md`](../user-guide/cli.md) — user guide
- [`../design/new.md`](../design/new.md) — project scaffold design (TBD)
