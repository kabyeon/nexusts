# 표준 데코레이터 마이그레이션 계획

> **브랜치**: `feat/standard-decorators`
> **목표**: `reflect-metadata` 의존성 제거 및 레거시 (`experimentalDecorators: true`)에서 TC39 표준 ES 데코레이터로 마이그레이션
> **상태**: **✅ 마이그레이션 완료** (코어 + CLI + 예제 — 테스트는 보류)

---

## 마이그레이션 결과

| 영역 | 상태 | 비고 |
|------|------|------|
| Phase 0: InputValue 기반 | ✅ 완료 | `input-value.ts`, `ctx-input.ts` — 체이닝 validation/sanitization |
| Phase 1: DI 컨테이너 리팩토링 | ✅ 완료 | `standard-inject.ts`, `standard-meta.ts` — 듀얼모드 (field + constructor injection) |
| Phase 2: 라우터 듀얼모드 | ✅ 완료 | `paramMeta.length === 0` 감지 → ctx 직접 전달 + `attachInputHelper()` |
| Phase 3: CLI 템플릿 | ✅ 완료 | CRUD, Nest, Service, Middleware, Adonis, Functional — 모두 field injection |
| Phase 3: 예제 마이그레이션 | ✅ 완료 | 34개 예제 모두 field injection + `ctx.req.param()`/`ctx.req.json()` 패턴 |
| Phase 4: `reflect-metadata` 제거 (non-test) | ✅ 완료 | packages/, examples/, benchmarks/ — 모든 import 및 package.json 제거 |
| Phase 4: Lazy loading | ✅ 완료 | `safe-reflect.ts` — 조건부 `import("reflect-metadata")` dynamic import |
| Phase 4: `package.json` deps 제거 | ✅ 완료 | root + packages/core — `"reflect-metadata"` 제거 |
| Phase 5: 테스트 파일 (import 제거) | ✅ 완료 | `tests/` — `import 'reflect-metadata'` 제거 완료 (6개 파일) |
| Phase 5: 테스트 스위트 통과 | 🔴 보류 | 전체 테스트 스위트 실행 필요 |
| DrizzleRepository 템플릿 | 🔴 보류 | `super(db, table)` 필요 — Drizzle 모듈 레벨 변경 필요 |

---

## 왜 마이그레이션하는가?

| 항목 | 레거시 데코레이터 | 표준 데코레이터 |
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

1. **Parameter decorators 제거**: `@Inject()`, `@Body()`, `@Param()`, `@Query()`, `@Ctx()`, `@Upload()`, `@UploadedFile()` → `ctx.req.param()` / `ctx.req.query()` / `await ctx.req.json()`
2. **`@Injectable` → `@Injectable()`**: 클래스/필드 decorator로 변경 (생성자 주입 → 필드 주입)
3. **`@Inject` → 프로퍼티 decorator**: 생성자 파라미터 → 클래스 필드
4. **`reflect-metadata` 제거**: 모든 패키지에서 삭제
5. **`experimentalDecorators`/`emitDecoratorMetadata` 제거**: tsconfig에서 삭제
6. **`design:paramtypes` 미사용**: DI 컨테이너가 타입 정보를 런타임에 추론하는 방식 변경

## 마이그레이션 단계

### Phase 0: Foundation — `InputValue` 헬퍼 시스템

Input validation/sanitization 체인 시스템:

```ts
// 새 API
const id = ctx.req.param("id");
const name = ctx.req.query("name");
const body = await ctx.req.json();
```

**생성된 파일:**

- `packages/core/src/http/input-value.ts` — `InputValue` 체이닝 클래스
- `packages/core/src/http/ctx-input.ts` — `attachInputHelper()`, `getInputHelper()`

### Phase 1: DI 컨테이너 리팩토링

변경 사항:

- `DIContainer`가 `design:paramtypes` 없이도 의존성 해결 가능
- `@Inject()` field decorator 지원 (Token 기반)
- `@Injectable()` → 표준 class decorator

```ts
// Before (legacy):
@Injectable()
class UserService {
  constructor(
    @Inject('DB') private db: Database,
    private logger: LoggerService
  ) {}
}

// After (standard):
@Injectable()
class UserService {
  @Inject('DB') declare db: Database;
  @Inject() declare logger: LoggerService;
}
```

### Phase 2: 코어 데코레이터 → 표준

| 데코레이터 | 변경 전 | 변경 후 |
|-----------|----------|-----------|
| `@Module({...})` | ClassDecorator | class decorator |
| `@Controller('/')` | ClassDecorator | class decorator |
| `@Injectable()` | ClassDecorator | class + field decorator |
| `@Get('/')` | MethodDecorator | method decorator |
| `@Post('/')` | MethodDecorator | method decorator |
| `@Inject(token)` | ParameterDecorator → FieldDecorator | ❌ parameter → ✅ field |
| `@Body()` | ParameterDecorator → 제거 | `await ctx.req.json()` |
| `@Param('id')` | ParameterDecorator → 제거 | `ctx.req.param('id')` |
| `@Query('page')` | ParameterDecorator → 제거 | `ctx.req.query('page')` |
| `@Ctx()` | ParameterDecorator → 제거 | `ctx` 직접 사용 |

### Phase 3: 패키지별 마이그레이션 ✅ 완료

| 패키지 | 변경사항 | 상태 |
|--------|----------|------|
| `@nexusts/core` | DI 컨테이너 field injection 지원, Router dual-mode, InputValue | ✅ |
| `@nexusts/cli` | 모든 템플릿 field injection + `ctx.req.*` 패턴, scaffold.ts 업데이트 | ✅ |
| `@nexusts/drizzle` | Repository 템플릿 — `super(db, table)` 필요로 별도 처리 필요 | 🔴 |
| 모든 examples/ (34개) | Constructor injection → field injection, `@Body`/`@Param` → `ctx.req.*` | ✅ |

템플릿 변경사항:

| 템플릿 | 변경 전 | 변경 후 |
|----------|---------|--------|
| CRUD Controller | `@Param("id")`, `@Body()`, constructor `@Inject` | `ctx.req.param("id")`, `await ctx.req.json()`, field `@Inject` |
| Nest Controller | constructor `@Inject` | field `@Inject` + `declare` |
| Service | constructor `@Inject` | field `@Inject` + `declare` |
| Middleware | `constructor()` (빈 생성자) | 동일 (변경 불필요) |
| Repository | constructor `@Inject(DrizzleService.TOKEN)` | 🔴 Drizzle 모듈 수준 변경 필요 |
| Inertia scaffold | constructor `@Inject(Inertia.TOKEN)` | field `@Inject(Inertia.TOKEN) declare inertia` |
| app/main.ts scaffold | `import 'reflect-metadata'` | 제거됨 |

### Phase 4: reflect-metadata 제거 ✅ 완료 (non-test)

| 항목 | 상태 |
|------|------|
| `packages/core/package.json` | ✅ `"reflect-metadata"` 제거 |
| root `package.json` | ✅ `"reflect-metadata"` 제거 |
| `packages/core/src/di/safe-reflect.ts` | ✅ 조건부 lazy loading으로 대체 (동기 Map fallback + async dynamic import) |
| `packages/cli/src/commands/db-migrate.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `packages/cli/src/commands/make-auth.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `packages/cli/src/commands/db-seed.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `examples/` 34개 | ✅ `import 'reflect-metadata'` 제거 + 패턴 마이그레이션 |
| `benchmarks/servers/nexusts.ts` | ✅ `import 'reflect-metadata'` 제거 |
| `tests/` (import) | ✅ 6개 테스트 파일에서 `import 'reflect-metadata'` 제거 |

`safe-reflect.ts` 변경사항:

```ts
// Before: 고정 import
import "reflect-metadata";

// After: 조건부 lazy loading + 동기 Map fallback
let _refMetaAttempted = false;
function ensureReflectMetadata(): void {
  if (_refMetaAttempted) return;
  _refMetaAttempted = true;
  if (typeof Reflect.getMetadata === "function") return;
  import("reflect-metadata").catch(() => {});
}
// 동기 Map fallback으로 데코레이터 실행 시점의 메타데이터 저장 보장
const fallbackStore = new Map<string, any>();
```

### Phase 5: 테스트 및 CI

- ✅ Smoke tests 통과 (71/71)
- ✅ Core/View/DI/Config/Cache/Logger 등 통과 (109/109)
- 🔴 전체 테스트 스위트 실행 필요
- 🔴 CI 워크플로우 업데이트 필요

## 실제 진행 소요 시간

| Phase | 예상 시간 | 실제 |
|-------|----------|------|
| Phase 0 (Foundation) | 1-2일 | ✅ 완료 (기존 작업) |
| Phase 1 (DI) | 2-3일 | ✅ 완료 (기존 작업) |
| Phase 2 (Core decorators) | 3-5일 | ✅ 완료 (기존 작업) |
| Phase 3 (CLI + Examples) | 5-7일 | ✅ **~4시간** |
| Phase 4 (reflect-metadata 제거) | 1일 | ✅ **~2시간** |
| Phase 5 (테스트) | 2-3일 | 🔴 보류 |
| **합계** | **~14-21일** | **기존 작업 + ~6시간** |

---

## 보류 결정

- `@Cron`, `@Interval`, `@Timeout` — 이미 metadata-only 패턴, 표준 방식으로 자연스럽게 변경 가능
- `@OnEvent` — 동일
- `@Retry`, `@CircuitBreaker`, `@Bulkhead` — 이미 metadata-only + eager apply 패턴
- Inertia `@Inject(Inertia.TOKEN)` — 프로퍼티 decorator로 변경 완료
