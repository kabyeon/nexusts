# Dependency Injection

> 한국어 버전: [`dependency-injection.ko.md`](./dependency-injection.ko.md)

NexusTS uses NestJS-style dependency injection. Services, repositories,
and adapters are wired together through `@Module({ providers, exports })`
and resolved automatically at construction time.

## 1. The basics

A service is just a class with `@Injectable()`:

```ts
// app/services/user.service.ts
import { Inject, Injectable } from '@nexusts/core';
import type { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class UserService {
  constructor(
    @Inject('LOG') private readonly log: { info: (msg: string) => void },
  ) {}

  findAll() {
    this.log.info('UserService.findAll');
    return [{ id: 1, name: 'Alice' }];
  }
}
```

The container builds the dependency graph from the module's `providers`
list and resolves it lazily on first use.

---

## 2. Why explicit `@Inject(...)`?

TypeScript can read constructor parameter types from
`design:paramtypes` metadata — **but only** when you compile with `tsc`
and `emitDecoratorMetadata: true`. Bun's native TypeScript transformer
does **not** emit that metadata.

NexusTS therefore standardizes on **explicit `@Inject(Token)`** on each
parameter. This makes the framework portable across `tsc`, `ts-node`,
Bun, and Deno.

```ts
// Always portable — recommended.
constructor(@Inject(UserRepository) private repo: UserRepository) {}

// Works under tsc, ignored by Bun's transformer.
constructor(private repo: UserRepository) {}
```

> If you build with `tsc` first and run with `node` or `bun dist/`,
> the bare-type form works. Under `bun app/...` (the default), use
> `@Inject(...)`.

---

## 3. Providers

A `Provider` is anything that produces a value when asked. Five shapes:

### 3.1 Class provider (most common)

```ts
@Module({
  providers: [UserService],   // shorthand: { provide: UserService, useClass: UserService }
})
```

### 3.2 Value provider

```ts
import { drizzle } from 'drizzle-orm/bun-sqlite';

@Module({
  providers: [
    { provide: 'DB', useValue: drizzle('app.db') },
  ],
})
```

Inject as:

```ts
@Injectable()
class UserRepository {
  constructor(@Inject('DB') private db: any) {}
}
```

### 3.3 Factory provider

```ts
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useFactory: () => ({
        env: process.env['NODE_ENV'] ?? 'development',
        port: Number(process.env['PORT'] ?? 3000),
      }),
    },
  ],
})
```

### 3.4 Alias provider

```ts
@Module({
  providers: [
    { provide: 'LOGGER', useExisting: 'CONSOLE_LOGGER' },
    { provide: 'CONSOLE_LOGGER', useValue: console },
  ],
})
```

### 3.5 Token provider (symbol/string keys)

```ts
const CONFIG = Symbol('CONFIG');

@Module({
  providers: [
    { provide: CONFIG, useValue: { port: 3000 } },
  ],
})
```

---

## 4. Modules

A `@Module` declares what it owns and what it shares:

```ts
@Module({
  imports: [OtherModule],          // bring in another module's exports
  controllers: [UserController],   // HTTP handlers
  providers: [UserService, UserRepository, { provide: 'DB', useValue: db }],
  exports: [UserService],          // make these tokens available to importers
})
export class UserModule {}
```

> **Encapsulation.** Anything not in `exports` is private to its
> declaring module. `OtherModule` cannot inject `UserRepository` unless
> `UserModule` re-exports it.

### Module tree

A typical app:

```ts
@Module({ imports: [UserModule, OrderModule, AuthModule] })
class AppModule {}
```

Each module gets its own **child container** (`DIContainer`); exported
tokens surface to the parent so importing modules can resolve them.

---

## 5. Constructor injection

```ts
@Injectable()
class OrderService {
  constructor(
    @Inject(UserService) private users: UserService,
    @Inject('PAYMENT_GATEWAY') private payments: PaymentGateway,
  ) {}
}
```

The container walks the parameter list, resolves each token, and
constructs the instance. Failed resolution throws an error pointing
at the missing token.

---

## 6. Property injection

Not recommended, but supported via a class-field decorator (rarely
needed):

```ts
@Injectable()
class LegacyService {
  @Inject('LEGACY_DB')
  private legacyDb!: any;
}
```

Prefer constructor injection — it makes dependencies explicit and
testable.

---

## 7. Scopes

| Scope | Behaviour | Default? |
| ----- | --------- | -------- |
| `singleton` | One instance per container | yes |
| `transient` | New instance per `resolve()` | no |

```ts
@Module({
  providers: [
    UserService,                                // singleton
    {
      provide: 'REQUEST_ID',
      useFactory: () => crypto.randomUUID(),
      scope: 'transient',                       // new on every resolve
    },
  ],
})
```

A `request` scope (one instance per HTTP request) is planned for v0.2.

---

## 8. Circular dependencies

The container detects cycles and throws a helpful error:

```
Error: Circular dependency detected for token "A"
  A → B → C → A
```

Break a cycle by introducing a factory:

```ts
// Before: A imports B, B imports A → cycle.
@Injectable()
class A { constructor(@Inject(B) b: B) {} }
@Injectable()
class B { constructor(@Inject(A) a: A) {} }

// After: B receives A via a forward-reference factory.
@Injectable()
class B {
  private a?: A;
  setA(a: A) { this.a = a; }
}
```

---

## 9. Testing with mocks

Replace a provider in tests by creating a child container manually:

```ts
import { DIContainer } from '@nexusts/core';

const container = new DIContainer();
container.register({ provide: 'DB', useValue: mockDb });
container.register(UserRepository);

const repo = container.resolve(UserRepository);   // gets the mocked DB
```

Or use `Application.bootstrap()` with overrides (planned for v0.2):

```ts
// Future API — not yet implemented.
const app = Application.bootstrap(AppModule, {
  overrides: [
    { provide: 'DB', useValue: mockDb },
  ],
});
```

---

## 10. Common patterns

### Database / ORM

```ts
@Module({
  providers: [
    { provide: 'DB', useValue: drizzle('app.db') },
    UserRepository,
  ],
  exports: [UserRepository],
})
class DatabaseModule {}

@Module({
  imports: [DatabaseModule],
  providers: [UserService],
})
class UserModule {}
```

### Configuration

```ts
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useFactory: () => loadConfig(),   // throws if env is invalid
    },
  ],
  exports: ['CONFIG'],
})
class ConfigModule {}
```

### Logging

```ts
@Module({
  providers: [
    { provide: 'LOG', useValue: console },
  ],
})
class AppModule {
  // every service can `@Inject('LOG')` the same logger.
}
```

---

## 11. Debugging

Set `NEXUS_DEBUG=1` to print the dependency graph at boot:

```bash
NEXUS_DEBUG=1 bun app/main.ts
```

Output:

```
[nexus] Modules: 3
[nexus] Controllers: [UserController, OrderController]
[nexus] Providers (root): [Inertia, CONFIG, DB]
[nexus] Inertia: enabled
```
