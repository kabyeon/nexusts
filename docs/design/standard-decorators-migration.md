# Standard Decorator Migration Plan

> **Branch**: `feat/standard-decorators`
> **Goal**: Remove `reflect-metadata` dependency and migrate from legacy (`experimentalDecorators: true`) to TC39 standard ES decorators.
> **Status**: **✅ Migration Complete** (core + CLI + examples — tests pending)

---

## Migration Results

| 영역 | 상태 | 비고 |
|------|------|------|
| Phase 0: InputValue Foundation | ✅ 완료 | `input-value.ts`, `ctx-input.ts` — 체이닝 validation/sanitization |
| Phase 1: DI Container Refactoring | ✅ 완료 | `standard-inject.ts`, `standard-meta.ts` — 듀얼모드 (field + constructor injection) |
| Phase 2: Router Dual-Mode | ✅ 완료 | `paramMeta.length === 0` 감지 → ctx 직접 전달 + `attachInputHelper()` |
| Phase 3: CLI Templates | ✅ 완료 | CRUD, Nest, Service, Middleware, Adonis, Functional — 모두 field injection |
| Phase 3: Examples Migration | ✅ 완료 | 34개 예제 모두 field injection + `ctx.req.param()`/`ctx.req.json()` 패턴 |
| Phase 4: `reflect-metadata` 제거 (non-test) | ✅ 완료 | packages/, examples/, benchmarks/ — 모든 import 및 package.json 제거 |
| Phase 4: Lazy loading | ✅ 완료 | `safe-reflect.ts` — 조건부 `import("reflect-metadata")` dynamic import |
| Phase 4: `package.json` deps 제거 | ✅ 완료 | root + packages/core — `"reflect-metadata"` 제거 |
| Phase 5: Test files (import 제거) | ✅ 완료 | `tests/` — `import 'reflect-metadata'` 제거 완료 (6 files) |
| Phase 5: Test suites 통과 | 🔴 보류 | 전체 테스트 스위트 실행 필요 |
| DrizzleRepository 템플릿 | 🔴 보류 | `super(db, table)` 필요 — Drizzle 모듈 레vel 변경 필요 |

---

## Why Migrate?

| 항목 | Legacy Decorators | Standard Decorators |
|------|------------------|-------------------|
| TypeScript 설정 | `experimentalDecorators: true` | 기본 (설정 불필요) |
| 런타임 의존성 | `reflect-metadata` 필수 | 불필요 |
| 표준 | TypeScript 전용 | TC39 stage-3 |
| 번들 크기 | `reflect-metadata` (~16KB) | 0 |
| Parameter decorator | ✅ 지원 | ❌ 미지원 |
| Property decorator | ✅ | ✅ (`field` decorator) |
| Metadata | `Reflect.getMetadata` | `Symbol.metadata` |
| `design:paramtypes` | ✅ (emitDecoratorMetadata) | ❌ 미지원 |

## Breaking Changes

1. **Parameter decorators 제거**: `@Inject()`, `@Body()`, `@Param()`, `@Query()`, `@Ctx()`, `@Upload()`, `@UploadedFile()` → `ctx.input.*` / `ctx.param()` / `ctx.query()` / `ctx.body()`
2. **`@Injectable` → `@Injectable()`**: 클래스/필드 decorator로 변경 (생성자 주입 → 필드 주입)
3. **`@Inject` → 프로퍼티 decorator**: 생성자 파라미터 → 클래스 필드
4. **`reflect-metadata` 제거**: 모든 패키지에서 삭제
5. **`experimentalDecorators`/`emitDecoratorMetadata` 제거**: tsconfig에서 삭제
6. **`design:paramtypes` 미사용**: DI 컨테이너가 타입 정보를 런타임에 추론하는 방식 변경

## Migration Phases

### Phase 0: Foundation — `ctx.input` Helper System (우선 구현)

Input validation/sanitization 체인 시스템:

```ts
// 새 API
const id = ctx.param("id").number().required().value();
const name = ctx.query("name").trim().max(100).value();
const body = ctx.body.parse(CreateUserSchema);
```

**Files to create:**

- `packages/core/src/http/input-value.ts` — `InputValue` 체이닝 클래스
- `packages/core/src/http/input.ts` — `ctx.input`, `ctx.param()`, `ctx.query()`, `ctx.body()` 확장
- `tests/core/input-value.test.ts`

### Phase 1: DI Container Refactoring

변경 사항:

- `DIContainer`가 `design:paramtypes` 없이도 의존성 해결 가능하도록
- `@Inject()` field decorator 지원 (Token 기반)
- `@Injectable()` → 표준 class decorator

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

### Phase 2: Core Decorators → 표준

변경할 decorator 목록:

| Decorator | 현재 방식 | 표준 방식 |
|-----------|----------|-----------|
| `@Module({...})` | ClassDecorator | class decorator |
| `@Controller('/')` | ClassDecorator | class decorator |
| `@Injectable()` | ClassDecorator | class + field decorator |
| `@Get('/')` | MethodDecorator | method decorator |
| `@Post('/')` | MethodDecorator | method decorator |
| `@Inject(token)` | ParameterDecorator → FieldDecorator | ❌ parameter → ✅ field |
| `@Body()` | ParameterDecorator → 제거 | `ctx.body()` |
| `@Param('id')` | ParameterDecorator → 제거 | `ctx.param('id')` |
| `@Query('page')` | ParameterDecorator → 제거 | `ctx.query('page')` |
| `@Ctx()` | ParameterDecorator → 제거 | `ctx` 직접 사용 |
| `@Upload()` | ParameterDecorator → 제거 | `ctx.upload()` |
| `@UploadedFile()` | ParameterDecorator → 제거 | `ctx.uploadedFile()` |

### Phase 3: 패키지별 마이그레이션 ✅ 완료

| 패키지 | 변경사항 | 상태 |
|--------|----------|------|
| `@nexusts/core` | DI 컨테이너 field injection 지원, Router dual-mode, InputValue | ✅ |
| `@nexusts/cli` | 모든 템플릿 field injection + `ctx.req.*` 패턴, scaffold.ts 업데이트 | ✅ |
| `@nexusts/drizzle` | Repository 템플릿 — `super(db, table)` 필요로 별도 처리 필요 | 🔴 |
| 모든 examples/ (34개) | Constructor injection → field injection, `@Body`/`@Param` → `ctx.req.*` | ✅ |

Template 변경사항:

| Template | 변경 전 | 변경 후 |
|----------|---------|--------|
| CRUD Controller | `@Param("id")`, `@Body()`, constructor `@Inject` | `ctx.req.param("id")`, `await ctx.req.json()`, field `@Inject` |
| Nest Controller | constructor `@Inject` | field `@Inject` + `declare` |
| Service | constructor `@Inject` | field `@Inject` + `declare` |
| Middleware | `constructor()` (blank) | 동일 (변경 불필요) |
| Repository | constructor `@Inject(DrizzleService.TOKEN)` | 🔴 Drizzle 모듈 수준 변경 필요 |
| Inertia scaffold | constructor `@Inject(Inertia.TOKEN)` | field `@Inject(Inertia.TOKEN) declare inertia` |
| app/main.ts scaffold | `import 'reflect-metadata'` | 제거됨 |

### Phase 4: reflect-metadata 제거 ✅ 완료 (non-test)

| 항목 | 상태 |
|------|------|
| `packages/core/package.json` | ✅ `"reflect-metadata"` 제거 |
| root `package.json` | ✅ `"reflect-metadata"` 제거 |
| `packages/core/src/di/safe-reflect.ts` | ✅ 조건부 `import("reflect-metadata")` dynamic import로 대체 |
| `packages/cli/src/commands/db-migrate.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `packages/cli/src/commands/make-auth.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `packages/cli/src/commands/db-seed.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `packages/core/src/` (import) | ✅ 모두 조건부 lazy 로딩으로 변경 |
| `examples/` 34개 | ✅ `import 'reflect-metadata'` 제거 + 패턴 마이그레이션 |
| `benchmarks/servers/nexusts.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `tests/` (import) | ✅ 6개 테스트 파일에서 `import 'reflect-metadata'` 제거 |
| `tests/` (legacy 테스트) | 🔴 다수 테스트 파일 아직 `import 'reflect-metadata'` 유지 — legacy 경로 테스트 필요 |

`safe-reflect.ts` 변경사항:

```ts
// Before: 고정 import
import "reflect-metadata";

// After: 조건부 lazy loading
let _refMetaLoaded = false;
function ensureReflectMetadata(): void {
  if (_refMetaLoaded) return;
  _refMetaLoaded = true;
  import("reflect-metadata").catch(() => {});
}
```

`DIContainer` 변경사항:

```ts
// field injection 지원
const fieldInjections = getFieldInjections(cls);
if (hasFieldInjections) {
  const instance = new cls();
  for (const [fieldName, token] of Object.entries(fieldInjections)) {
    instance[fieldName] = this.resolve(token);
  }
  return instance;
}
// fallback: legacy constructor injection
const paramTypes = safeGetMeta(METADATA_KEY.PARAMTYPES, cls) || [];
return new cls(...params);
```

### Phase 5: 테스트 및 CI

- 전체 테스트 스위트 통과 확인 (314+ tests)
- Smoke tests 통과 확인 (69 tests)
- CI 워크플로우 업데이트
- 문서 업데이트

## 실제 진행 소요 시간

| Phase | 예상 시간 | 실제 |
|-------|----------|------|
| Phase 0 (Foundation) | 1-2일 | ✅ 완료 (기존 작업) |
| Phase 1 (DI) | 2-3일 | ✅ 완료 (기존 작업) |
| Phase 2 (Core decorators) | 3-5일 | ✅ 완료 (기존 작업) |
| Phase 3 (CLI + Examples) | 5-7일 | ✅ **~4시간** (스캐폴드 + 템플릿 + 34개 예제) |
| Phase 4 (reflect-metadata 제거) | 1일 | ✅ **~2시간** |
| Phase 5 (테스트) | 2-3일 | 🔴 보류 — 테스트 스위트 실행 및 수정 필요 |
| **Total** | **~14-21일** | **기존 작업 + ~6시간** |

---

## Phase 0: 상세 구현 계획

### `InputValue` 클래스

```ts
class InputValue<T = any> {
  constructor(private raw: T) {}
  
  trim(): InputValue<string> { ... }
  xss(): InputValue<string> { ... }
  htmlEscape(): InputValue<string> { ... }
  number(): InputValue<number> { ... }
  required(): InputValue<T> { ... }
  max(length: number): InputValue<string> { ... }
  min(length: number): InputValue<string> { ... }
  default(val: T): InputValue<T> { ... }
  value(): T { return this.raw; }
}
```

### `Context` 확장

```ts
// packages/core/src/http/context.ts 에 추가
declare module 'hono' {
  interface Context {
    input: InputHelper;
    param(name: string): InputValue;
    query(name: string): InputValue;
    body(): Promise<any>;
    body(schema: ZodSchema): Promise<any>;
    validate<T>(schema: ZodSchema<T>): T;
    upload(name: string): UploadValue;
    uploadedFile(name: string): File | undefined;
  }
}
```

### 컨트롤러 예시 (변경 후)

```ts
import { Controller, Get, Post, Injectable } from '@nexusts/core';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  @Inject('UserService') declare userService: UserService;

  @Get('/:id')
  show(ctx: Context) {
    const id = ctx.param('id').number().required().value();
    return this.userService.findById(id);
  }

  @Post('/')
  async create(ctx: Context) {
    const input = await ctx.validate(CreateUserSchema);
    return this.userService.create(input);
  }
}
```

---

## 보류 결정

- `@Cron`, `@Interval`, `@Timeout` — 이미 metadata-only 패턴이라 표준 방식으로 자연스럽게 변경 가능
- `@OnEvent` — 동일
- `@Retry`, `@CircuitBreaker`, `@Bulkhead` — 이미 metadata-only + eager apply 패턴
- Inertia `@Inject(Inertia.TOKEN)` — 프로퍼티 decorator로 변경
