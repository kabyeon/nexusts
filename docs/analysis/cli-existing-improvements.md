# Existing CLI Code Improvement Points

> 분석: `packages/cli/src/` 전체 34개 파일 (24개 명령어 + 7개 core + 3개 인프라)
> 각 항목은 severity (🔴=버그/🟠=리팩터/🟢=마이너) 와 파일 위치를 명시

---

## 🔴 P0 — 버그 / 오작동

### 1. `--version` 버전 불일치

**파일**: `packages/cli/src/index.ts` (line 60)

```ts
const PKG_VERSION = "0.1.0";  // ← 하드코딩!
```

실제 패키지 버전은 `package.json` 의 `"0.9.7"` 인데 CLI는 `"0.1.0"` 을 출력한다. `version.ts` 의 `VERSION` 값을 사용해야 한다.

### 2. `--no-flag` 파싱 미적용

**파일**: `packages/cli/src/core/args.ts` (line 82-85)

```ts
if (next !== undefined && !next.startsWith("-")) {
    setFlag(flags, flagName, next);
    i += 2;
}
```

`--no-color` 를 `--no-color value` 로 해석해버림. `--no-foo` 는 항상 `foo = false` 여야 하는데 값 소비 로직이 먼저 실행됨. `--no-foo=bar` 도 처리 안 됨.

### 3. `make:controller --no-service` 의 regex import 제거가 깨지기 쉬움

**파일**: `packages/cli/src/commands/make-controller.ts` (line 64-68)

```ts
.replace(
    /import .*\n/g,
    skipService
        ? (m: string) => (m.includes("services/") ? "" : m)
        : (m: string) => m,
)
```

`import` 문이 여러 줄에 걸쳐 있거나 서비스 외 다른 import가 `services/` 문자열을 포함하면 엉뚱한 import가 사라짐.

### 4. `db:migrate` Kysely 스크립트 SQL 인젝션 위험

**파일**: `packages/cli/src/commands/db-migrate.ts`

```ts
function buildKyselyMigrateScript(folder: string, ...) {
    return \`...const migrationsFolder = \${JSON.stringify(folder)};...\`
}
```

`JSON.stringify()` 로 감싸긴 했지만, Dialect 코드에서 `process.env.DATABASE_URL` 을 직접 사용하고 있어서 악의적인 env var 주입 가능.

---

## 🟠 P1 — 구조적 개선 필요

### 5. Inline 템플릿 문자열을 `templates/` 로 이동

**파일들**:

- `make-auth.ts` — `AUTH_INSTANCE_TEMPLATE`, `ENV_EXAMPLE_TEMPLATE`
- `make-listener.ts` — `LISTENER_TEMPLATE`
- `make-queue.ts` — `WORKER_TEMPLATE`, `JOB_HELPER_TEMPLATE`, `WIRE_HINT`
- `make-schedule.ts` — `TASK_TEMPLATE`
- `make-session.ts` — `SESSION_TEMPLATE`

현재 5개 명령어가 대형 템플릿 문자열을 인라인으로 들고 있음. 템플릿 로직과 명령어 로직이 섞여 유지보수 어려움.

**개선**: 각 명령어의 템플릿을 `templates/` 아래 별도 파일로 분리하고 `templates/index.ts` 에 등록.

### 6. `pluralize` / `singularize` 함수 중복

**파일들**:

- `packages/cli/src/core/fs.ts` — `nameVariants()` 내부에 `pluralize()` (line 77-82)
- `packages/cli/src/core/template.ts` — render filter 용 `pluralize()` / `singularize()` (line 135-143)

두 곳이 동일한 pluralize 로직을 중복 정의. 한 곳에서 수정하면 다른 쪽이 깨짐.

**개선**: 공통 util을 `core/` 에 단일 함수로 추출.

### 7. `inferTableName()` 함수 중복

**파일들**:

- `packages/cli/src/commands/make-migration.ts` (line 187-193)
- `packages/cli/src/commands/db-generate.ts` (line 108-113)

동일한 `create_xxx_table` 파싱 로직이 두 파일에 중복.

### 8. `mapSqlType()` / `mapDrizzleType()` 의 dialect 매핑 중복

**파일들**:

- `packages/cli/src/commands/make-migration.ts` — `mapSqlType()`, `renderDrizzleColumns()`
- `packages/cli/src/templates/model/drizzle-dialect.ts` — `mapDrizzleType()`
- `packages/cli/src/commands/make-model.ts` — `renderColumns()` (drizzle branch)

세 군데에서 postgres/mysql/sqlite 타입 매핑을 각각 구현. DDL 타입 매핑이 각자 달라 dialect 간 불일치 발생 가능.

**개선**: `renderDrizzleColumns`, `renderSqlColumns`, `renderKyselyColumns` 를 `core/` 의 단일 모듈로 통합.

### 9. `init.ts` 와 `new.ts` 의 중복 option resolution

**파일들**:

- `new.ts` — `resolveOpt()` + `VALID_OPTIONS` 상수
- `init.ts` — 동일한 `resolveOpt()` + `VALID_OPTIONS` 상수

완전히 동일한 함수 + 상수가 두 파일에 복사. 한쪽만 수정하면 다른 쪽이 안 맞음.

**개선**: 공통 `resolveProjectOption()` 을 `core/prompts.ts` 나 `core/index.ts` 로 이동.

### 10. `make:session` / `make:schedule` / `make:queue` 의 하드코딩된 경로

**파일**:

- `make-session.ts`: `"app/session/services/"` (ctx.config.paths 무시)
- `make-schedule.ts`: `"app/schedule/tasks/"` (ctx.config.paths 무시)
- `make-queue.ts`: `"app/queue/workers/"`, `"app/queue/jobs/"` (ctx.config.paths 무시)

**영향**: 사용자가 `nx.config.ts` 에서 `paths` 를 변경해도 이 명령어들은 무시하고 고정 경로에 생성함.

### 11. `config.ts` 의 Dynamic import 실패 처리 불일치

**파일**: `packages/cli/src/core/config.ts` (line 188-199)

```ts
try {
    const mod = await import(path);
    config = (mod.default ?? mod) as Partial<NxConfig>;
} catch (importErr) {
    console.warn(...);  // ← console.warn 사용 (logger 아님)
    config = {};
}
```

- 자체 `logger` 가 아닌 `console.warn` 사용
- 실패 후 `config = {}` 로 설정하면 모든 값이 default로 fallback되는데, 사용자에게 그 사실을 명확히 전달하지 않음
- `console.warn` 의 메시지는 `logger` 와 포맷이 달라 출력 일관성 깨짐

### 12. `db:migrate` 의 임시 스크립트 파일 정리 위험

**파일**: `packages/cli/src/commands/db-migrate.ts`

```ts
const tmpFile = resolve(cwd, ".nx-kysely-migrate.mjs");
// ... write, execute, finally: unlink
```

임시 `.mjs` 파일을 프로젝트 루트에 생성. `finally` 블록에서 `unlink` 하지만 프로세스가 SIGKILL 등으로 죽으면 cleanup 안 됨. `.gitignore` 에 포함되거나 OS temp dir 사용 필요.

### 13. SQL Migration 파일에 timestamp 대신 `Date.now()` 사용

**파일**: `packages/cli/src/commands/db-generate.ts` (line 121)

```ts
const timestamp = Date.now();
const filename = `${timestamp}_${name.replace(...)}.sql`;
```

다른 migration 생성 코드들은 `YYYYMMDD_HHmmss` 형식의 가독성 있는 timestamp를 사용하는데 SQL path만 밀리초 숫자 사용.

---

## 🟢 P2 — 코드 품질 / 설계 개선

### 14. `repl.ts` 의 `listServices` 가 container API에 의존

**파일**: `packages/cli/src/commands/repl.ts`

```ts
const c = container as { listProviders?: () => ... };
if (typeof c.listProviders !== "function") return [];
```

Container의 `listProviders()` 가 실제로 존재하는지 런타임에 확인. DI 컨테이너 인터페이스가 바뀌면 REPL이 조용히 빈 배열 반환.

### 15. `template.ts` 의 escape 처리 부재

```ts
// 현재: 특수 문자 escape 없음
"{{ name }}" → 그냥 바꿈
```

사용자가 템플릿에 `{{` 문자 자체를 출력하려면 escape 수단이 없음. Rails ERB (`%%`) 처럼 escape 처리 필요.

### 16. `make:crud.ts` 의 150줄 `run()` 메서드

**파일**: `packages/cli/src/commands/make-crud.ts`

`run()` 이 150줄에 육박. 파일 생성 블록(controller/service/repository/model/dto/module/test)을 작은 메서드로 분리 필요.

### 17. `db:seed.ts` 의 문자열 코드 생성

**파일**: `packages/cli/src/commands/db-seed.ts`

```ts
const script = `
import { DrizzleService } from '@nexusts/drizzle';
...
`;
```

런타임에 문자열로 생성되는 스크립트는 TypeScript 검증을 받지 못함. import 경로 오타나 API 변경 시 조용히 실패.

### 18. `route:list.ts` 의 파일 시스템 기반 컨트롤러 스캔

**파일**: `packages/cli/src/commands/route-list.ts`

```ts
const files = readdirSync(controllersDir).filter((f) => f.endsWith(".ts"));
for (const file of files) {
    const mod = await import(fullPath);
    // ...
}
```

- 컴파일되지 않은 `.ts` 파일을 직접 `import()` → Bun이 ts를 직접 실행하므로 동작하지만, 프로젝트가 별도 빌드 단계가 있으면 깨짐
- 모듈 캐싱 문제: `?t=${Date.now()}` 로 우회하지만 매번 새로 import

### 19. Scaffold 로그의 휘발성

`nx make:crud` / `nx make:controller` 등으로 생성한 파일 목록을 `.nx-scaffold-log` 같은 곳에 저장하지 않음. 추후 `nx destroy` 구현의 기반이 필요.

### 20. `--dry-run` 미지원

Rails의 `--pretend`, NestJS의 `--dry-run` 에 해당하는 기능 없음.

### 21. `new.ts` 가 생성하는 tsconfig가 `experimentalDecorators: true` 로 고정

TC39 표준 데코레이터(스테이지 3)가 기본인데 새 프로젝트를 `experimentalDecorators: true` 로 생성 → 표준 모드 사용자가 수동 변경 필요.

**AGENTS.md** §6: "New code MUST use standard patterns" — 새로운 프로젝트의 기본값이 legacy인건 모순.

### 22. `info.ts` 의 환경변수 목록 하드코딩

```ts
const envKeys = ["NODE_ENV", "PORT", "NEXUS_DEBUG", ...];
```

모든 가능한 env 키를 수동 관리. 새 패키지 추가시마다 `info.ts` 도 수정해야 함 → 누락되기 쉬움.

### 23. `scaffold.ts` 의 `generateProjectFiles()` 가 너무 많은 책임

단일 함수가 `nx.config.ts`, `.env`, `.gitignore`, `main.ts`, `app.module.ts`, `home.controller.ts`, `README.md`, Inertia 페이지, Drizzle 설정까지 전부 생성.

### 24. `nameVariants()` 의 `pluralize` 에지 케이스

- `"Status"` → `"Statuses"` (✅) vs Rails: `"Statuses"` (✅)
- `"Crisis"` → `"Crisises"` (❌) vs Rails: `"Crises"` (정규 규칙만 있음, 불규칙 미지원)
- `"Mouse"` → `"Mouses"` (❌)

영어 불규칙 복수형을 전혀 처리하지 않음.

### 25. `repl.ts` 의 `.help` 명령어가 Pre-loaded variables 설명에 특정 패키지명 하드코딩

REPL 도움말이 `@nexusts/drizzle`, `@nexusts/logger` 등을 하드코딩. 새로운 패키지가 `PRELOAD` 배열에 추가되어도 도움말은 업데이트되지 않음.

---

## 📋 요약: 개선 우선순위

| 우선순위 | 항목 | 영향 |
|---------|------|------|
| 🔴 P0-1 | `--version` 버전 불일치 | `nx --version` 이 0.1.0 출력 |
| 🔴 P0-2 | `--no-flag` 파싱 오작동 | `--no-color` 가 `--no-color value` 로 해석 |
| 🔴 P0-3 | `make:controller --no-service` regex 취약 | 잘못된 import 삭제 가능 |
| 🟠 P1-5 | 5개 명령어 인라인 템플릿 → `templates/` 이동 | 유지보수성 |
| 🟠 P1-6 | `pluralize` 중복 (template.ts + fs.ts) | 한쪽만 수정시 불일치 |
| 🟠 P1-7 | `inferTableName` 중복 (make-migration + db-generate) | 동일 로직 2벌 |
| 🟠 P1-8 | DDL 타입 매핑 3중 중복 | dialect 간 불일치 위험 |
| 🟠 P1-9 | `resolveOpt` + `VALID_OPTIONS` init/new 중복 | 한쪽만 업데이트시 깨짐 |
| 🟠 P1-10 | 3개 명령어 hardcoded 경로 | `nx.config.ts paths` 미준수 |
| 🟠 P1-11 | config.ts console.warn 사용 | 출력 일관성 |
| 🟠 P1-13 | SQL migration에 Date.now() 사용 | 포맷 불일치 |
| 🟢 P2-14~25 | 코드 품질 / 내구성 / 일관성 | 장기 유지보수 |

---

## 바로 고칠 수 있는 간단한 것들

1. `index.ts` line 60: `PKG_VERSION = "0.1.0"` → `PKG_VERSION = VERSION`
2. `args.ts`: `--no-foo` 처리 로직 단순화 (값 소비 전 먼저 `no-` prefix 검사)
3. `db-generate.ts` line 121: `Date.now()` → `formatTimestamp(new Date())`
4. `make-session.ts`: hardcoded `"app/session/services/"` → `ctx.config.paths`
5. `make-schedule.ts`: hardcoded `"app/schedule/tasks/"` → `ctx.config.paths`
6. `make-queue.ts`: hardcoded `"app/queue/"` → `ctx.config.paths`
