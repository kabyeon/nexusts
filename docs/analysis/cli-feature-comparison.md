# CLI Feature Comparison: NexusTS vs Rails / Laravel / AdonisJS / NestJS

> Analyzed: 2026-06-27
> Goal: Evidence-based feature list for enhancing `@nexusts/cli` (v0.9.7)

---

## 1. Current State: NexusTS `nx` CLI Commands (24)

| Command | Aliases | Description |
|---------|---------|-------------|
| `new` | `n` | Create a new project (interactive prompts) |
| `init` | - | Initialize project in an existing directory |
| `config` | - | View/modify configuration |
| `make:crud` | `crud`, `scaffold` | Full CRUD scaffold (controller+service+repo+model+dto+module+test) |
| `make:controller` | `mc` | Generate a controller (nest/adonis/functional styles) |
| `make:repository` | - | Generate a repository |
| `make:service` | - | Generate a service |
| `make:module` | - | Generate a module |
| `make:model` | - | Generate a model |
| `make:migration` | - | Generate a migration |
| `make:middleware` | - | Generate middleware |
| `make:validator` | - | Generate a validator |
| `make:auth` | - | Configure authentication |
| `make:queue` | - | Configure queue |
| `make:schedule` | - | Configure scheduler |
| `make:listener` | - | Generate an event listener |
| `make:session` | - | Configure session |
| `db:migrate` | - | Run migrations |
| `db:generate` | - | Generate migration (Drizzle Kit) |
| `db:seed` | - | Run seed data |
| `route:list` | `routes` | List registered routes |
| `info` | `i` | Print project configuration |
| `repl` | `console`, `shell` | Interactive REPL |

---

## 2. Competitor CLI Comparison Table

### 2.1 Rails (`bin/rails`)

| Category | Command | Description | NexusTS |
|----------|---------|-------------|---------|
| Generate | `generate model` | Model + migration + test + fixture | ✅ `make:model` |
| Generate | `generate scaffold` | Full CRUD with views (10+ files) | ✅ `make:crud` |
| Generate | `generate resource` | Model+controller+routes (no views) | ❌ |
| Generate | `generate controller NAME action1 action2` | Controller + routes + per-action views | ✅ (no action support) |
| Generate | `generate migration` | Migration | ✅ |
| Generate | `generate channel` | ActionCable channel | N/A |
| Generate | `generate job` | Background job | ❌ |
| Generate | `generate mailer` | Mailer | ❌ |
| Generate | `generate task` | Rake task | ❌ |
| Generate | `generate helper` | Helper module | ❌ |
| Generate | `generate system_test` | System test | ❌ |
| Destroy | `destroy` | Inverse of generate (delete files) | ❌ **Critical** |
| DB | `db:create` | Create database | ❌ |
| DB | `db:drop` | Drop database | ❌ |
| DB | `db:reset` | drop + create + schema load + seed | ❌ |
| DB | `db:setup` | create + schema load + seed | ❌ |
| DB | `db:rollback` | Rollback migration | ❌ |
| DB | `db:version` | Current migration version | ❌ |
| DB | `db:migrate:status` | Migration status (up/down) | ❌ |
| DB | `db:schema:dump` | Generate schema file | ❌ |
| DB | `db:schema:load` | Load schema file | ❌ |
| DB | `db:seed` | Load seed data | ✅ |
| DB | `db:seed:replant` | Truncate + seed | ❌ |
| DB | `db:fixtures:load` | Load fixtures | ❌ |
| DB | `db:system:change --to=postgresql` | Switch database system | ❌ |
| DB | `db:prepare` | Setup if DB missing, migrate otherwise | ❌ |
| DB | `dbconsole` | Native DB console | ❌ |
| Server | `server` (-p, -b, -e, -d) | Development server | ❌ **Critical** |
| Code | `console` | Rails console (sandbox mode) | ✅ `repl` |
| Code | `runner` | Run script in app context | ❌ |
| Code | `boot` | Boot app only (debugging) | ❌ |
| Inspect | `routes` | Routes list (-c, -g, --expanded) | ✅ (basic) |
| Inspect | `about` | Version/environment info | ✅ `info` |
| Inspect | `initializers` | List initializers | ❌ |
| Inspect | `middleware` | Middleware stack | ❌ |
| Inspect | `stats` | LOC/class/method statistics | ❌ |
| Inspect | `notes` | Search TODO/FIXME annotations | ❌ |
| Inspect | `secret` | Generate secret key | ❌ |
| Inspect | `credentials:edit/show` | Encrypted credential management | ❌ |
| Utility | `tmp:clear` / `tmp:create` | Temp directory management | ❌ |
| Utility | `time:zones:all` | Timezone list | ❌ |
| Assets | `assets:precompile` / `assets:clean` | Asset compilation/cleanup | ❌ |
| Install | `turbo:install` / `stimulus:install` | Library install scaffold | ❌ |

### 2.2 Laravel (`php artisan`)

| Category | Command | Description | NexusTS |
|----------|---------|-------------|---------|
| Generate | `make:command` | Create an Artisan command | ❌ |
| Generate | `make:job` | Create a queue job | ❌ |
| Generate | `make:event` | Create an event class | ❌ |
| Generate | `make:listener` | Create a listener | ✅ (basic) |
| Generate | `make:notification` | Create a notification | ❌ |
| Generate | `make:mail` | Create a mail class | ❌ |
| Generate | `make:rule` | Create a validation rule | ❌ |
| Generate | `make:policy` | Create an authorization policy | ❌ |
| Generate | `make:provider` | Create a service provider | ❌ |
| Generate | `make:factory` | Create a model factory | ❌ |
| Generate | `make:seeder` | Create a seeder | ❌ |
| Generate | `make:cast` | Create a custom cast | ❌ |
| Generate | `make:channel` | Create a broadcast channel | ❌ |
| Generate | `make:scope` | Create an Eloquent scope | ❌ |
| Generate | `make:observer` | Create a model observer | ❌ |
| Generate | `make:enum` | Create an enum | ❌ |
| Generate | `make:exception` | Create an exception class | ❌ |
| Generate | `make:test` | Create a test | ✅ (CRUD only) |
| Generate | `stub:publish` | Publish stubs for customization | ❌ **High Value** |
| DB | `migrate:fresh` | Drop all tables + migrate | ❌ |
| DB | `migrate:refresh` | Rollback all + migrate | ❌ |
| DB | `migrate:status` | Migration status | ❌ |
| DB | `migrate:rollback` | Rollback | ❌ |
| DB | `db:show` | Database table info | ❌ |
| DB | `db:monitor` | Database connection monitoring | ❌ |
| DB | `db:wipe` | Drop all tables | ❌ |
| Package | `vendor:publish` | Publish package config/files | ❌ |
| Package | `add` | Install + configure (AdonisJS too) | ❌ **High Value** |
| REPL | `tinker` | Interactive REPL | ✅ |
| Optimize | `optimize` | Cache configuration optimization | ❌ |
| Optimize | `config:cache` / `config:clear` | Config cache | ❌ |
| Optimize | `route:cache` / `route:clear` | Route cache | ❌ |
| Optimize | `view:cache` / `view:clear` | View cache | ❌ |
| Optimize | `event:cache` / `event:clear` | Event cache | ❌ |

### 2.3 AdonisJS (`node ace`)

| Category | Command | Description | NexusTS |
|----------|---------|-------------|---------|
| Server | `serve` | HMR dev server | ❌ **Critical** |
| Build | `build` | Production build | ❌ |
| Install | `add` | Install + configure in one step | ❌ **High Value** |
| Configure | `configure` | Configure after install | ❌ |
| Generate | `make:controller --resource --api --singular` | Controller with rich options | ✅ (partial) |
| Generate | `make:validator --resource` | Validator with CRUD presets | ✅ (partial) |
| Generate | `make:event` | Event class | ❌ |
| Generate | `make:listener --event=` | Listener + event in one go | ✅ (partial) |
| Generate | `make:exception` | Exception class | ❌ |
| Generate | `make:command` | ACE command generator | ❌ |
| Generate | `make:provider` | Service provider | ❌ |
| Generate | `make:preload` | Preload file | ❌ |
| Generate | `make:test --suite=` | Test for a specific suite | ❌ |
| Generate | `make:mail --intent=` | Mail class (custom intent) | ❌ |
| Generate | `make:policy` | Bouncer policy | ❌ |
| Generate | `make:view` | Edge.js template | ❌ |
| Generate | `eject` | Copy package stubs to app | ❌ **High Value** |
| Generate | `generate:key` | Generate APP_KEY → auto-write .env | ❌ |
| Env | `env:add` | .env + .env.example + validation in one go | ❌ **High Value** |
| Inspect | `list:routes --json --table --middleware` | Routes + middleware filter | ❌ |
| Inspect | `inspect:rcfile` | Print merged config file | ❌ |

### 2.4 NestJS (`nest`)

| Category | Command | Description | NexusTS |
|----------|---------|-------------|---------|
| Generate | `generate module` | Module | ✅ |
| Generate | `generate controller` | Controller | ✅ |
| Generate | `generate service` | Service | ✅ |
| Generate | `generate class` | Plain class | ❌ |
| Generate | `generate decorator` | Custom decorator | ❌ |
| Generate | `generate filter` | Exception filter | ❌ |
| Generate | `generate guard` | Guard | ❌ |
| Generate | `generate interceptor` | Interceptor | ❌ |
| Generate | `generate pipe` | Pipe | ❌ |
| Generate | `generate middleware` | Middleware | ✅ |
| Generate | `generate gateway` | WebSocket gateway | ❌ |
| Generate | `generate resolver` | GraphQL resolver | ❌ |
| Generate | `generate resource` | CRUD resource (REST + GraphQL) | ✅ (REST only) |
| Generate | `generate library` | Monorepo library | ❌ |
| Generate | `generate interface` | Interface | ❌ |
| Build | `build --builder swc --watch` | Builder selection (SWC/tsc/webpack) + watch | ❌ |
| Start | `start --debug --watch` | Dev server + debug | ❌ |
| Install | `add` | Install nest library | ❌ |
| Info | `info` | Package versions + system info | ✅ |

---

## 3. Differentiation Analysis: **Must-Have** Features (Priority 1)

These features are shared across all competitor frameworks and directly affect developer experience.

### P1-Critical: `nx serve` / `nx dev` — Development Server

**Rails** `bin/rails server` / **Laravel** `php artisan serve` / **AdonisJS** `node ace serve` / **NestJS** `nest start --watch`

- Currently relies on `bun run dev` (or `bun --hot app/main.ts`)
- CLI needs to control Bun's HMR/Hot Reload
- Required flags: `--port`, `--host`, `--debug`, `--hmr`, `--watch`

### P1-Critical: `nx destroy` / `nx d` — Inverse of Generate

**Rails** `bin/rails destroy` / supported by all frameworks

- Delete all files created by `nx make:controller User` in one command
- `nx d controller User` → removes controller, test, route, etc.
- Store file creation log in `.nx-scaffold-log` and reference it on destroy

### P1-Critical: `nx build` — Production Build

**AdonisJS** `node ace build` / **NestJS** `nest build --builder swc`

- Currently relies on `bun run build` (`build.ts`)
- Flags: `--minify`, `--sourcemap`, `--outdir`, `--target`
- Integrate Bun.build with tsc type-checking
- `--watchAssets` (watch non-TS files)

### P1-High: `nx db:rollback` / `nx db:migrate:status` — DB Rollback + Status

**Rails** `db:rollback STEP=n` / `db:migrate:status` / `db:migrate:redo`

- Drizzle Kit-based rollback command
- Print migration status table

### P1-High: `nx db:create` / `nx db:drop` — Database Create/Drop

**Rails** `db:create` / `db:drop` / **Laravel** `db:wipe`

- Read DATABASE_URL from config and create/drop database
- `--if-exists`, `--force` flags

### P1-High: `nx make:resource` — Rails-Style Resource

**Rails** `generate resource` / **NestJS** `generate resource`

- Unlike `make:crud`, generates model+controller+routes+migration only (no views/scaffold)
- Ideal for API-only resource generation

---

## 4. User Experience Enhancements (Priority 2)

### P2-Medium: `nx add <package>` — One-Step Install + Configure

**AdonisJS** `node ace add @adonisjs/lucid` / **NestJS** `nest add`

- `bun add @nexusts/<pkg>` + auto-configure in one step
- Auto-modify `nx.config.ts` after install (e.g., add cache config for `@nexusts/cache`)
- `--dev` (devDependency), `--force` (overwrite files) flags

### P2-Medium: `nx make:exception` / `nx make:filter` — Exception/Filter

**AdonisJS** `make:exception` / **NestJS** `generate filter`

- Custom exception class
- HTTP exception filter

### P2-Medium: `nx make:event` + `nx make:listener --event=` — Event Generation

**AdonisJS** `make:event` / `make:listener --event=` / **Laravel** `make:event` / `make:listener`

- Option to generate event class and listener together
- Enhance existing `make:listener`

### P2-Medium: `nx make:job` — Queue Job

**Laravel** `make:job` / **Rails** `generate job`

- Job class for queue execution
- Integrate with `@nexusts/queue`

### P2-Medium: `nx make:gateway` — WebSocket Gateway

**NestJS** `generate gateway`

- Gateway class with `@WebSocketGateway` decorator
- Integrate with `@nexusts/ws`

### P2-Medium: `nx make:guard` / `nx make:interceptor` / `nx make:pipe` — NestJS-Style

**NestJS** `generate guard` / `generate interceptor` / `generate pipe`

- Guard: `@Injectable()` + `CanActivate` interface
- Interceptor: `@Injectable()` + transformation logic
- Pipe: `@Injectable()` + `PipeTransform` interface

### P2-Medium: `nx make:test --suite=` — Suite-Specific Test

**AdonisJS** `make:test --suite=unit`

- Select `tests/unit/`, `tests/feature/`, `tests/e2e/` suites
- Standalone `make:test` command (currently only bundled with CRUD scaffold)

### P2-Medium: `nx route:list --middleware --json --table`

**AdonisJS** `list:routes --middleware --json --table`

- Middleware filtering
- JSON output format
- Group by controller/method

### P2-Medium: `nx middleware` — Middleware Stack Output

**Rails** `bin/rails middleware`

- Print the app's middleware chain in order
- Debug which middleware processes each request

### P2-Medium: `nx generate:key` — APP_KEY/Secret Generation

**AdonisJS** `generate:key` / **Rails** `secret`

- Cryptographically secure random key
- Auto-write to `.env` or `--show` for terminal output

---

## 5. Nice-to-Have Features (Priority 3)

### P3: `nx env:add` — Add Env Variable + Validation Rules

**AdonisJS** `env:add`

- Update `.env` + `.env.example` + `start/env.ts` validation in one command
- `--type=string|boolean|number|enum`

### P3: `nx stub:publish` / `nx eject` — Stub Customization

**Laravel** `stub:publish` / **AdonisJS** `eject`

- Copy built-in template stubs to the user's project
- Customized stubs are reflected in `nx make:controller` and others

### P3: `nx db:reset` / `nx db:setup` / `nx db:prepare`

**Rails** `db:reset` / `db:setup` / `db:prepare`

- `db:reset`: drop + create + migrate + seed
- `db:setup`: create + schema load + seed
- `db:prepare`: setup if DB missing, migrate otherwise

### P3: `nx db:seed:replant` — Truncate + Seed in One Go

### P3: `nx dbconsole` — Native DB Console

**Rails** `dbconsole` / alias `db`

- Auto-run `sqlite3 app.db` / `psql -U user db` etc.

### P3: `nx make:notification` — Notification Class

**Laravel** `make:notification`

### P3: `nx make:mail` — Mail Class

**AdonisJS** `make:mail --intent=`

### P3: `nx make:policy` — Authorization Policy

**AdonisJS** `make:policy` / **Laravel** `make:policy`

### P3: `nx make:provider` — Service Provider

**AdonisJS** `make:provider --environments=`

### P3: `nx make:decorator` — Custom Decorator

**NestJS** `generate decorator`

### P3: `nx make:resolver` — GraphQL Resolver

**NestJS** `generate resolver`

### P3: `nx make:enum` — Enum (TypeScript union + Zod)

**Laravel** `make:enum`

### P3: `nx make:command` — CLI Command Generator

**AdonisJS** `make:command` / **Laravel** `make:command`

- Scaffold for user-defined `nx` commands

### P3: `nx make:helper` — Helper/Utility

**Rails** `generate helper`

### P3: `nx make:observer` — Model Observer

**Laravel** `make:observer`

### P3: `nx runner` — Script Runner

**Rails** `runner` / `runner --skip-executor`

- `nx runner scripts/seed-users.ts`
- Run arbitrary scripts in app context

### P3: `nx notes` — TODO/FIXME Search

**Rails** `notes --annotations FIXME,OPTIMIZE`

### P3: `nx stats` — LOC Statistics

**Rails** `stats`

### P3: `nx optimize` / `nx config:cache` — Performance Optimization

**Laravel** `config:cache` / `route:cache` / `optimize`

- Config caching (read-only in production)
- Route caching
- View caching

### P3: `nx about` — Version Info (NestJS-Style)

**NestJS** `info` (ASCII logo + version tree)

- Current `nx info` is config-focused → split `nx about`
- ASCII logo + OS/Node/Bun/package version tree

### P3: `nx tmp:clear` — Temp File Cleanup

**Rails** `tmp:clear`

- Clean `.nx-repl-history`, `dist/`, temp build files

### P3: REPL Enhancements — `.runner` / `.about` / `.db` commands

**Laravel Tinker** / **Rails Console** advanced features

- `.runner <path>`: Run external scripts inside REPL
- `.about`: REPL session info
- `.db`: Switch directly to DB console

### P3: Shell Completion — `--bash-completion` / PowerShell

- Generate shell completion scripts
- `nx` + Tab → command list
- `nx make:` + Tab → controller/service/model etc.

---

## 6. Internal Architecture Improvements

| Area | Problem | Improvement |
|------|---------|------------|
| **Command registration** | Manual array in `commands/index.ts` | Decorator-based auto-registration (`@Command({name, aliases})`) |
| **Args parser** | Custom `parseArgs()` (limited) | Adopt `yargs` / `commander` / `clack` or enhance: subcommands, `--flag=value`, `--no-flag` |
| **Prompts** | `readline`-based (bare-bones) | Modern prompts via `@clack/prompts` or `ink` (spinner, multiselect, search) |
| **Output formatting** | Raw ANSI codes | Progress bars, spinners, rich tables via `clack`/`ink` |
| **Config loading** | Manual `loadConfig()` | Config caching + schema validation (Zod) |
| **Testing** | Per-command test files exist (`tests/cli/`) | Expand unit test coverage (currently 6 files) |
| **Error handling** | `try/catch` + `logger.error()` | Structured error codes + suggestion messages |
| **Interaction detection** | `--no-interaction` flag | Laravel-style `PromptsForMissingInput` interface |

---

## 7. Final Priority Summary

### 🔴 P1 — Must-Have (MVP)

1. `nx serve` / `nx dev` — Development server (HMR)
2. `nx destroy` — Inverse of generate
3. `nx build` — Production build
4. `nx db:rollback` / `nx db:migrate:status`
5. `nx db:create` / `nx db:drop`
6. `nx make:resource` — API-only resource

### 🟠 P2 — Significant Improvement

1. `nx add <package>` — One-step install
2. `nx make:exception` / `nx make:filter`
3. `nx make:event` (with listener)
4. `nx make:job`
5. `nx make:gateway` (WebSocket)
6. `nx make:guard` / `nx make:interceptor` / `nx make:pipe`
7. `nx make:test --suite=`
8. `nx route:list` — middleware/JSON/grouping enhancements
9. `nx middleware` — Middleware stack output
10. `nx generate:key`
11. Prompt system enhancement (`@clack/prompts`)
12. Command completion script

### 🟢 P3 — Nice to Have

1. `nx env:add` / `nx stub:publish` / `nx eject`
2. `nx db:reset` / `nx db:setup` / `nx db:prepare` / `nx db:seed:replant` / `nx dbconsole`
3. `nx make:notification` / `nx make:mail` / `nx make:policy` / `nx make:provider`
4. `nx make:decorator` / `nx make:resolver` / `nx make:enum`
5. `nx make:command`
6. `nx make:helper` / `nx make:observer`
7. `nx runner` / `nx notes` / `nx stats`
8. `nx optimize` / `nx config:cache`
9. `nx about` (ASCII logo + version tree)
10. `nx tmp:clear`
11. REPL enhancements (`.runner`, `.db`)
12. Args parser upgrade (`yargs`/`commander`)

---

## 8. Recommended Implementation Order

### Phase 1 (on `feat/cli-enhancements` branch)

1. **`nx serve`** — Wrap Bun HMR as a CLI command (biggest impact)
2. **`nx destroy`** — Scaffold log-based file deletion
3. **Args parser enhancement** — Proper subcommands, `--flag=value`, `--no-flag`
4. **Prompt enhancement** — Adopt `@clack/prompts`

### Phase 2 (same branch or separate)

1. **`nx build`** — Production build command
2. **`nx add <package>`** — One-step install + configure
3. **DB commands** — `rollback`, `status`, `create`, `drop`
4. **`make:resource`** — API resource generator

### Phase 3

1. Remaining P2-P3 commands
2. Command auto-registration system
3. Shell completion
4. Config caching/optimization

---

*This document was created experimentally on the `feat/cli-enhancements` branch.*
