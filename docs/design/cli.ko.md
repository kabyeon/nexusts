# CLI 모듈 — 디자인

> English version: [`cli.md`](./cli.md)

이 문서는 `@nexusts/cli`의 아키텍처를 설명한다: `nx` 명령
러너, 스캐폴드 생성기, 코드 템플릿, config 로더, REPL.

## 목표

1. **Adonis ACE 스타일 명령 러너.** `nx make:controller User`,
   `nx make:crud Post`, `nx route:list`, `nx info` — Laravel/Adonis
   개발자에게 익숙한 컨벤션.
2. **스캐폴드 생성기.** `nx new my-app`은 설정 가능한 스타일 (nest,
   functional, adonis), view 엔진 (rendu, edge, inertia), ORM
   (drizzle, prisma, kysely)로 완전한 프로젝트를 생성.
3. **코드 생성.** `nx make:*` 명령은 일관된 템플릿으로 보일러플레이트
   파일 (controllers, services, modules, models, migrations 등)
   생성.
4. **프로젝트 introspection.** `nx info`는 런타임 환경 출력;
   `nx route:list`는 등록된 HTTP 라우트 출력; `nx config`는
   해석된 `nx.config.ts` 출력.
5. **REPL.** `nx repl`은 애플리케이션의 DI container를 사용 가능한
   인터랙티브 TypeScript REPL을 엶.

## 아키텍처

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
│  Core utilities │ │ Command  │ │  Templates   │
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

## 인자 파싱

`core/args.ts`의 `parseArgs()`가 처리:

- **Flags**: `--name value`, `-n value`, `--flag` (boolean),
  `--no-flag` (부정), `--flag=a,b` (배열).
- **Positional**: 순서대로 모든 non-flag 인자.
- **Commands**: 등록된 명령 (또는 `help` fallback)과 일치하는 첫 번째
  positional.

```ts
// nx make:controller User --no-views --resource
// → { command: "make:controller", positional: ["User"], flags: { views: false, resource: true } }
```

## Config 로딩

`loadConfig(cwd)`는 다음 순서로 config 파일을 검색:

1. `nx.config.ts` (주 — TypeScript, Bun/tsx로 로드)
2. `nx.config.js` (fallback)
3. `.nxrc.json` (JSON fallback — 더 단순, TS 없음)

Config는 `NxConfig` 타입으로 파싱·검증:

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

Config 값은 기본값과 merge되며, 둘 다 존재할 때 CLI flag가 이김.

## 템플릿 엔진

`core/template.ts`의 템플릿 시스템은 `templates/` 디렉토리에서 파일을
렌더링. 사용:

- **EJS 스타일 문법**: `<%= name %>` 값, `<% if (...) { %>` 조건.
- **명령별 컴파일**: 템플릿이 로드되고, 명령의 context 변수로 렌더링되며,
  타겟 경로에 기록됨.
- **스타일 인식**: controller 템플릿은 세 변형으로 존재 — `nest.ts`,
  `functional.ts`, `adonis.ts` — 프로젝트의 설정된 스타일에 따라 선택.

```ts
// template.render('controller/nest.ts', {
//   name: 'User',
//   path: 'users',
//   resource: true,
// })
```

템플릿 파일은 published 패키지에 임베드 (`bun build`로 번들).

## 명령

### 스캐폴드

| 명령 | 설명 |
|------|------|
| `nx new <name>` | 새 프로젝트를 처음부터 생성 |
| `nx init` | 기존 프로젝트에 nexus 초기화 |

### 코드 생성 (make:*)

| 명령 | 별칭 | 생성 |
|------|-----|------|
| `nx make:controller <name>` | `mc` | Controller 파일 |
| `nx make:service <name>` | `ms` | Injectable service |
| `nx make:module <name>` | `mm` | Module 클래스 |
| `nx make:model <name>` | `mmodel` | Model + decorators |
| `nx make:migration <name>` | `mmigrate` | Migration 파일 |
| `nx make:crud <name>` | `mcrud` | Full CRUD (controller + service + module + dto + test) |
| `nx make:middleware <name>` | `mmw` | Hono 미들웨어 |
| `nx make:validator <name>` | `mv` | Zod validator |
| `nx make:auth <name>` | `mauth` | Auth 모듈 보일러플레이트 |
| `nx make:queue <name>` | `mq` | Queue worker |
| `nx make:schedule <name>` | `msched` | Cron job |
| `nx make:listener <name>` | `ml` | Event listener |
| `nx make:session <name>` | `msess` | Session 설정 |

### 데이터베이스

| 명령 | 설명 |
|------|------|
| `nx db:migrate` | 대기 중인 migration 실행 |
| `nx db:generate` | 스키마 diff에서 migration 생성 |
| `nx db:seed` | Seed 파일 실행 |

### Introspection

| 명령 | 설명 |
|------|------|
| `nx info` | 런타임 정보 출력 (Bun/Node 버전, 프레임워크 버전, config) |
| `nx route:list` | 등록된 모든 HTTP 라우트 출력 |
| `nx config` | 해석된 `nx.config.ts` 출력 |
| `nx repl` | 인터랙티브 TS REPL 열기 |

## REPL (`nx repl`)

REPL은 application 모듈을 로드하고, DI container를 해석한 후, 인터랙티브
TypeScript 셸 (Bun의 내장 `Bun.repl()` 또는 Node의 `node:repl` 사용)로 진입.

REPL 컨텍스트에서 사용 가능:

| 변수 | 값 |
|------|---|
| `app` | `Application` 인스턴스 |
| `container` | `app.container` (DI container) |
| `resolve<T>(token)` | `container.resolve<T>(token)`의 단축 |
| `config` | 로드된 `NxConfig` |

## 크로스 런타임

CLI는 Bun과 Node.js 둘 다에서 실행:

- **Bun**: 주 런타임. 빠른 I/O를 위해 `Bun.write()`, `Bun.file()` 사용.
  REPL은 `Bun.repl()` 사용.
- **Node.js**: `fs/promises`와 Node의 내장 `repl`로 fallback.
  TypeScript 파싱은 `nx.config.ts` 로드를 위해 `tsx` 또는 `ts-node` 필요.

런타임 감지는 `nexusts/redis`와 `nexusts/ws`의 같은 패턴:

```ts
const isBun = typeof Bun !== 'undefined';
```

## Future work

- **`nx generate <type> <name>`** — `nx make:*`의 대안으로 통합 생성기
  명령 (Adonis 스타일).
- **`nx serve`** — 파일 watch + auto-reload 개발 서버 (현재 사용자는
  `bun run dev` 실행).
- **`nx test`** — config 자동 감지로 테스트 실행.
- **플러그인 생성기** — `nx.config.ts` plugins 배열을 통한 third-party
  생성기 패키지 지원.
- **인터랙티브 `nx new`** — 모든 옵션 (style, view, ORM, auth, session
  등)에 대한 TUI 프롬프트.

## 참고

- [`../user-guide/cli.ko.md`](../user-guide/cli.ko.md) — 사용자 가이드
- [`../design/new.ko.md`](../design/new.ko.md) — 프로젝트 스캐폴드 디자인
  (TBD)
