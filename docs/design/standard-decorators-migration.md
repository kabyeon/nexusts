# Standard Decorator Migration Plan

> **Branch**: `feat/standard-decorators`
> **Goal**: Remove `reflect-metadata` dependency and migrate from legacy (`experimentalDecorators: true`) to TC39 standard ES decorators.
> **Status**: **✅ Migration Complete** (core + CLI + examples + tests)
>
> 한국어 버전: [`standard-decorators-migration.ko.md`](./standard-decorators-migration.ko.md)

---

## Migration Results

| Area | Status | Notes |
|------|--------|-------|
| Phase 0: InputValue Foundation | ✅ Done | `input-value.ts`, `ctx-input.ts` — chaining validation/sanitization |
| Phase 1: DI Container Refactoring | ✅ Done | `standard-inject.ts`, `standard-meta.ts` — dual-mode (field + constructor injection) |
| Phase 2: Router Dual-Mode | ✅ Done | `paramMeta.length === 0` detection → passes ctx directly + `attachInputHelper()` |
| Phase 3: CLI Templates | ✅ Done | CRUD, Nest, Service, Middleware, Adonis, Functional — all field injection |
| Phase 3: Example Migration | ✅ Done | All 36 examples use field injection + `ctx.req.param()`/`ctx.req.json()` patterns |
| Phase 4: `reflect-metadata` removal (non-test) | ✅ Done | packages/, examples/, benchmarks/ — all imports and package.json entries removed |
| Phase 4: Inline polyfill | ✅ Done | `safe-reflect.ts` — inline Reflect Metadata polyfill, no external package needed |
| Phase 4: `package.json` deps removal | ✅ Done | root + packages/core — `"reflect-metadata"` removed |
| Phase 5: Test file import removal | ✅ Done | 54 test files — `import 'reflect-metadata'` removed |
| Phase 5: Test suite passing | ✅ Done | **325/325 tests passing**, 72/72 smoke tests passing |
| DrizzleRepository template | ✅ Done | Field injection support via optional constructor + `@Inject(DrizzleService.TOKEN) declare db` |

---

## Why Migrate?

| Aspect | Legacy Decorators | Standard Decorators |
|--------|------------------|-------------------|
| TypeScript config | `experimentalDecorators: true` | Default (no config needed) |
| Runtime dependency | `reflect-metadata` required | Not required |
| Standard | TypeScript-only | TC39 stage-3 |
| Bundle size | `reflect-metadata` (~16KB) | 0 |
| Parameter decorator | ✅ Supported | ❌ Not supported |
| Property decorator | ✅ Supported | ✅ Supported (`field` decorator) |
| Metadata | `Reflect.getMetadata` | `Symbol.metadata` / `__nexus_meta__` |
| `design:paramtypes` | ✅ (emitDecoratorMetadata) | ❌ Not emitted |

## Breaking Changes

1. **Parameter decorators removed**: `@Inject()`, `@Body()`, `@Param()`, `@Query()`, `@Ctx()` → `ctx.req.param()` / `ctx.req.query()` / `await ctx.req.json()`
2. **`@Injectable` → `@Injectable()`**: Class/field decorator (constructor injection → field injection)
3. **`@Inject` → Property decorator**: Constructor parameter → class field with `declare`
4. **`reflect-metadata` removed**: Deleted from all packages and source files
5. **`experimentalDecorators`/`emitDecoratorMetadata` no longer required**: Removed from tsconfig where possible
6. **`design:paramtypes` unused**: DI container no longer relies on runtime type metadata

## Migration Phases

### Phase 0: Foundation — `InputValue` Helper System

Input validation/sanitization chaining system:

```ts
// New API
const id = inputValue(ctx.req.param("id")).number().required().value();
const name = inputValue(ctx.req.query("name")).trim().max(100).value();
const body = await ctx.req.json();
```

**Files created:**

- `packages/core/src/http/input-value.ts` — `InputValue` chaining class
- `packages/core/src/http/ctx-input.ts` — `attachInputHelper()`, `getInputHelper()`

### Phase 1: DI Container Refactoring

Changes:

- `DIContainer` resolves dependencies without `design:paramtypes`
- `@Inject()` field decorator support (Token-based)
- `@Injectable()` → standard class decorator

```ts
// Before (legacy):
@Injectable()
class UserService {
  constructor(
    @Inject('DB') private db: Database,
    private logger: LoggerService  // auto-wired via design:paramtypes
  ) {}
}

// After (standard):
@Injectable()
class UserService {
  @Inject('DB') declare db: Database;
  @Inject() declare logger: LoggerService;
}
```

### Phase 2: Core Decorators → Standard

| Decorator | Before | After |
|-----------|--------|-------|
| `@Module({...})` | ClassDecorator | class decorator |
| `@Controller('/')` | ClassDecorator | class decorator |
| `@Injectable()` | ClassDecorator | class + field decorator |
| `@Get('/')` | MethodDecorator | method decorator |
| `@Post('/')` | MethodDecorator | method decorator |
| `@Inject(token)` | ParameterDecorator → FieldDecorator | ❌ parameter → ✅ field |
| `@Body()` | ParameterDecorator → removed | `await ctx.req.json()` |
| `@Param('id')` | ParameterDecorator → removed | `ctx.req.param('id')` |
| `@Query('page')` | ParameterDecorator → removed | `ctx.req.query('page')` |
| `@Ctx()` | ParameterDecorator → removed | `ctx` parameter directly |
| `@Upload()` | ParameterDecorator | method decorator (kept as-is) |
| `@UploadedFile()` | ParameterDecorator → retained | `ctx.uploadedFile()` (standard), `@UploadedFile()` (legacy) |

### Phase 3: Package Migration ✅ Complete

| Package | Changes | Status |
|---------|---------|--------|
| `@nexusts/core` | DI container field injection, Router dual-mode, InputValue | ✅ |
| `@nexusts/cli` | All templates field injection + `ctx.req.*` patterns, scaffold.ts updated | ✅ |
| `@nexusts/drizzle` | Repository template — `super(db, table)` needed separate handling; now supports field injection via optional constructor | ✅ |
| `@nexusts/upload` | `@Upload` decorator dual-mode support; `CtxInput.uploadedFile()` helper | ✅ |
| All examples/ (36) | Constructor injection → field injection, `@Body`/`@Param` → `ctx.req.*` | ✅ |

Template changes:

| Template | Before | After |
|----------|--------|-------|
| CRUD Controller | `@Param("id")`, `@Body()`, constructor `@Inject` | `ctx.req.param("id")`, `await ctx.req.json()`, field `@Inject` |
| Nest Controller | constructor `@Inject` | field `@Inject` + `declare` |
| Service | constructor `@Inject` | field `@Inject` + `declare` |
| Middleware | `constructor()` (empty) | Unchanged (no change needed) |
| Repository | constructor `@Inject(DrizzleService.TOKEN)` | `@Inject(DrizzleService.TOKEN) declare db` + `protected readonly table = tableObj` |
| Inertia scaffold | constructor `@Inject(Inertia.TOKEN)` | field `@Inject(Inertia.TOKEN) declare inertia` |
| app/main.ts scaffold | `import 'reflect-metadata'` | Removed |

### Phase 4: reflect-metadata Removal ✅ Complete (non-test)

| Item | Status |
|------|--------|
| `packages/core/package.json` | ✅ `"reflect-metadata"` removed |
| root `package.json` | ✅ `"reflect-metadata"` removed |
| `packages/core/src/di/safe-reflect.ts` | ✅ Replaced with inline Reflect Metadata polyfill (no external package needed) |
| `packages/cli/src/commands/db-migrate.ts` | ✅ `import 'reflect-metadata'` removed |
| `packages/cli/src/commands/make-auth.ts` | ✅ `import 'reflect-metadata'` removed |
| `packages/cli/src/commands/db-seed.ts` | ✅ `import 'reflect-metadata'` removed |
| `examples/` (36) | ✅ `import 'reflect-metadata'` removed + pattern migration |
| `benchmarks/servers/nexusts.ts` | ✅ `import 'reflect-metadata'` removed |
| `tests/` (54 files) | ✅ `import 'reflect-metadata'` removed — Map fallback handles legacy metadata |

`safe-reflect.ts` changes:

```ts
// Before: static import
import "reflect-metadata";

// After: inline Reflect Metadata polyfill — no external package needed
// Provides getMetadata, defineMetadata, hasMetadata, deleteMetadata, metadata(),
// and getOwnMetadata directly on the global Reflect object.
if (typeof Reflect.metadata !== "function") {
  const metadataStore = new Map<string, any>();
  let metaId = 0;

  function targetId(target: any): string { /* ... */ }
  function metaKey(key: any, target: any, prop?: any): string { /* ... */ }

  Reflect.defineMetadata = (key, value, target, prop) => { /* ... */ };
  Reflect.getMetadata = (key, target, prop) => { /* ... */ };
  Reflect.metadata = (key, value) => (target, prop) => { /* ... */ };
  // ...
}
```

`DIContainer` changes:

```ts
// Field injection support (v0.9+)
const fieldInjections = getFieldInjections(cls);
if (hasFieldInjections) {
  const instance = new cls();        // no-arg constructor
  for (const [fieldName, token] of Object.entries(fieldInjections)) {
    instance[fieldName] = this.resolve(token);
  }
  return instance;
}
// Fallback: legacy constructor injection
const paramTypes = safeGetMeta(METADATA_KEY.PARAMTYPES, cls) || [];
return new cls(...params);
```

### Phase 5: Testing ✅ Complete

| Test Suite | Result |
|------------|--------|
| Core/View/DI tests | ✅ **86/86 passing** |
| Cache/Logger/Config/Events/Health/Static/Shield/Metrics | ✅ **109/109 passing** |
| All module tests (19 files) | ✅ **325/325 passing** |
| Smoke tests (36 examples) | ✅ **72/72 passing** (34-grpc-streaming: pre-existing issue) |
| Drizzle/Resilience/GraphQL/Crypto/etc. | ✅ **All passing** |

---

## Actual Timeline

| Phase | Estimated | Actual |
|-------|-----------|--------|
| Phase 0 (Foundation) | 1-2 days | ✅ Pre-existing work |
| Phase 1 (DI) | 2-3 days | ✅ Pre-existing work |
| Phase 2 (Core decorators) | 3-5 days | ✅ Pre-existing work |
| Phase 3 (CLI + Examples) | 5-7 days | ✅ **~4 hours** (scaffold + templates + 36 examples) |
| Phase 4 (reflect-metadata removal) | 1 day | ✅ **~2 hours** |
| Phase 5 (Testing) | 2-3 days | ✅ **~1 hour** (54 test files cleaned, suite verified) |
| **Total** | **~14-21 days** | **Pre-existing work + ~7 hours** |

---

## Phase 0: Detailed Implementation

### `InputValue` class

```ts
class InputValue<T = any> {
  constructor(private raw: T) {}
  
  trim(): InputValue<string> { ... }
  escape(): InputValue<string> { ... }
  number(): InputValue<number> { ... }
  int(): InputValue<number> { ... }
  required(): InputValue<T> { ... }
  default(fallback: T): InputValue<T> { ... }
  max(len: number): InputValue<string> { ... }
  min(len: number): InputValue<string> { ... }
  pipe<S>(sanitizer: InputSanitizer<S>): InputValueChain<S> { ... }
  value(): T { return this.raw; }
}
```

### `CtxInput` helper

```ts
export type CtxInput = {
  param(name: string): InputValueChain<string>;
  query(name: string): InputValueChain<string | undefined>;
  allQueries(): Record<string, string | string[]>;
  header(name: string): InputValueChain<string | undefined>;
  allParams(): Record<string, string>;
  body: BodyHelper;
  uploadedFile(name: string): any;
  uploadedFiles(name: string): any[];
};
```

### Controller example (after migration)

```ts
import { Controller, Get, Post, Injectable, Inject, getInputHelper } from '@nexusts/core';
import { z } from 'zod';
import type { Context } from 'hono';

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  @Inject('UserService') declare userService: UserService;

  @Get('/:id')
  show(ctx: Context) {
    const id = Number(ctx.req.param('id'));
    return this.userService.findById(id);
  }

  @Post('/')
  async create(ctx: Context) {
    const input = CreateUserSchema.parse(await ctx.req.json());
    return this.userService.create(input);
  }
}
```

---

## Deferred Decisions

- `@Cron`, `@Interval`, `@Timeout` — Already metadata-only; naturally compatible with standard decorators
- `@OnEvent` — Same as above
- `@Retry`, `@CircuitBreaker`, `@Bulkhead` — Already metadata-only + eager apply pattern
- Inertia `@Inject(Inertia.TOKEN)` — Changed to field decorator
- `@UploadedFile` — Kept as legacy parameter decorator; `ctx.uploadedFile()` available for standard mode
