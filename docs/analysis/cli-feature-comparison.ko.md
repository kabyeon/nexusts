# CLI 기능 비교: NexusTS vs Rails / Laravel / AdonisJS / NestJS

> 분석일: 2026-06-27
> 목표: `@nexusts/cli` (v0.9.7) 에 추가할 기능을 결정하기 위한 근거 자료

---

## 1. 현황: NexusTS `nx` CLI 명령어 목록 (24개)

| 명령어 | 별칭 | 설명 |
|--------|------|------|
| `new` | `n` | 새 프로젝트 생성 (인터랙티브 프롬프트) |
| `init` | - | 기존 디렉토리에 프로젝트 설정 |
| `config` | - | 설정 보기/수정 |
| `make:crud` | `crud`, `scaffold` | CRUD 풀 스캐폴드 (controller+service+repo+model+dto+module+test) |
| `make:controller` | `mc` | 컨트롤러 생성 (nest/adonis/functional 스타일) |
| `make:repository` | - | 레포지토리 생성 |
| `make:service` | - | 서비스 생성 |
| `make:module` | - | 모듈 생성 |
| `make:model` | - | 모델 생성 |
| `make:migration` | - | 마이그레이션 생성 |
| `make:middleware` | - | 미들웨어 생성 |
| `make:validator` | - | 밸리데이터 생성 |
| `make:auth` | - | 인증 설정 |
| `make:queue` | - | 큐 설정 |
| `make:schedule` | - | 스케줄러 설정 |
| `make:listener` | - | 이벤트 리스너 생성 |
| `make:session` | - | 세션 설정 |
| `db:migrate` | - | 마이그레이션 실행 |
| `db:generate` | - | 마이그레이션 생성 (Drizzle Kit) |
| `db:seed` | - | 시드 데이터 실행 |
| `route:list` | `routes` | 라우트 목록 출력 |
| `info` | `i` | 프로젝트 설정 출력 |
| `repl` | `console`, `shell` | 인터랙티브 REPL |

---

## 2. 경쟁 프레임워크 CLI 비교표

### 2.1 Rails (`bin/rails`)

| 카테고리 | 명령어 | 설명 | NexusTS |
|---------|--------|------|---------|
| 생성 | `generate model` | 모델 + 마이그레이션 + 테스트 + 픽스처 | ✅ `make:model` |
| 생성 | `generate scaffold` | 풀 CRUD (뷰 포함 10개 파일) | ✅ `make:crud` |
| 생성 | `generate resource` | 모델+컨트롤러+라우트 (뷰 없음) | ❌ |
| 생성 | `generate controller NAME action1 action2` | 컨트롤러 + 라우트 + 액션별 뷰 | ✅ (액션 미지원) |
| 생성 | `generate migration` | 마이그레이션 | ✅ |
| 생성 | `generate channel` | ActionCable 채널 | N/A |
| 생성 | `generate job` | 백그라운드 잡 | ❌ |
| 생성 | `generate mailer` | 메일러 | ❌ |
| 생성 | `generate task` | Rake 태스크 | ❌ |
| 생성 | `generate helper` | 헬퍼 모듈 | ❌ |
| 생성 | `generate system_test` | 시스템 테스트 | ❌ |
| 파괴 | `destroy` | 생성의 역연산 (파일 삭제) | ❌ **Critical** |
| DB | `db:create` | DB 생성 | ❌ |
| DB | `db:drop` | DB 삭제 | ❌ |
| DB | `db:reset` | drop + create + schema load + seed | ❌ |
| DB | `db:setup` | create + schema load + seed | ❌ |
| DB | `db:rollback` | 마이그레이션 롤백 | ❌ |
| DB | `db:version` | 현재 마이그레이션 버전 | ❌ |
| DB | `db:migrate:status` | 마이그레이션 상태 (up/down) | ❌ |
| DB | `db:schema:dump` | 스키마 파일 생성 | ❌ |
| DB | `db:schema:load` | 스키마 파일 로드 | ❌ |
| DB | `db:seed` | 시드 데이터 로드 | ✅ |
| DB | `db:seed:replant` | truncate + seed | ❌ |
| DB | `db:fixtures:load` | 픽스처 로드 | ❌ |
| DB | `db:system:change --to=postgresql` | DB 시스템 전환 | ❌ |
| DB | `db:prepare` | DB 없으면 setup, 있으면 migrate | ❌ |
| DB | `dbconsole` | DB 네이티브 콘솔 접속 | ❌ |
| 서버 | `server` (-p, -b, -e, -d) | 개발 서버 실행 | ❌ **Critical** |
| 코드 | `console` | Rails 콘솔 (sandbox 모드 지원) | ✅ `repl` |
| 코드 | `runner` | 스크립트 실행 (app context) | ❌ |
| 코드 | `boot` | 앱 부트만 (디버깅) | ❌ |
| 검사 | `routes` | 라우트 목록 (-c, -g, --expanded) | ✅ (기본) |
| 검사 | `about` | 버전/환경 정보 | ✅ `info` |
| 검사 | `initializers` | 이니셜라이저 목록 | ❌ |
| 검사 | `middleware` | 미들웨어 스택 | ❌ |
| 검사 | `stats` | LOC/클래스/메소드 통계 | ❌ |
| 검사 | `notes` | TODO/FIXME 주석 검색 | ❌ |
| 검사 | `secret` | 시크릿 키 생성 | ❌ |
| 검사 | `credentials:edit/show` | 암호화된 credential 관리 | ❌ |
| 유틸 | `tmp:clear` / `tmp:create` | 임시 디렉토리 관리 | ❌ |
| 유틸 | `time:zones:all` | 타임존 목록 | ❌ |
| 자산 | `assets:precompile` / `assets:clean` | 자산 컴파일/정리 | ❌ |
| 설치 | `turbo:install` / `stimulus:install` | 라이브러리 설치 스캐폴드 | ❌ |

### 2.2 Laravel (`php artisan`)

| 카테고리 | 명령어 | 설명 | NexusTS |
|---------|--------|------|---------|
| 생성 | `make:command` | 아티즌 명령어 생성 | ❌ |
| 생성 | `make:job` | 큐 잡 생성 | ❌ |
| 생성 | `make:event` | 이벤트 클래스 생성 | ❌ |
| 생성 | `make:listener` | 리스너 생성 | ✅ (기본) |
| 생성 | `make:notification` | 알림 클래스 생성 | ❌ |
| 생성 | `make:mail` | 메일 클래스 생성 | ❌ |
| 생성 | `make:rule` | Validation rule 생성 | ❌ |
| 생성 | `make:policy` | Authorization policy | ❌ |
| 생성 | `make:provider` | 서비스 프로바이더 | ❌ |
| 생성 | `make:factory` | 모델 팩토리 | ❌ |
| 생성 | `make:seeder` | 시더 생성 | ❌ |
| 생성 | `make:cast` | 커스텀 캐스트 | ❌ |
| 생성 | `make:channel` | 브로드캐스트 채널 | ❌ |
| 생성 | `make:scope` | Eloquent 스코프 | ❌ |
| 생성 | `make:observer` | 모델 옵저버 | ❌ |
| 생성 | `make:enum` | Enum 생성 | ❌ |
| 생성 | `make:exception` | 예외 클래스 | ❌ |
| 생성 | `make:test` | 테스트 생성 | ✅ (CRUD시만) |
| 생성 | `stub:publish` | 스텁 커스터마이징 | ❌ **High Value** |
| DB | `migrate:fresh` | drop all tables + migrate | ❌ |
| DB | `migrate:refresh` | rollback all + migrate | ❌ |
| DB | `migrate:status` | 마이그레이션 상태 | ❌ |
| DB | `migrate:rollback` | 롤백 | ❌ |
| DB | `db:show` | DB 테이블 정보 | ❌ |
| DB | `db:monitor` | DB 연결 모니터링 | ❌ |
| DB | `db:wipe` | 모든 테이블 드롭 | ❌ |
| 패키지 | `vendor:publish` | 패키지 설정/파일 publish | ❌ |
| 패키지 | `add` | 설치 + 설정 (AdonisJS에도 있음) | ❌ **High Value** |
| REPL | `tinker` | 인터랙티브 REPL | ✅ |
| 최적화 | `optimize` | 설정 캐시 최적화 | ❌ |
| 최적화 | `config:cache` / `config:clear` | 설정 캐시 | ❌ |
| 최적화 | `route:cache` / `route:clear` | 라우트 캐시 | ❌ |
| 최적화 | `view:cache` / `view:clear` | 뷰 캐시 | ❌ |
| 최적화 | `event:cache` / `event:clear` | 이벤트 캐시 | ❌ |

### 2.3 AdonisJS (`node ace`)

| 카테고리 | 명령어 | 설명 | NexusTS |
|---------|--------|------|---------|
| 서버 | `serve` | HMR 개발 서버 | ❌ **Critical** |
| 빌드 | `build` | 프로덕션 빌드 | ❌ |
| 설치 | `add` | 패키지 설치 + configure 원스탭 | ❌ **High Value** |
| 설정 | `configure` | 패키지 설치 후 설정 | ❌ |
| 생성 | `make:controller --resource --api --singular` | 컨트롤러 + 옵션 다양함 | ✅ (부분) |
| 생성 | `make:validator --resource` | 밸리데이터 + CRUD 프리셋 | ✅ (부분) |
| 생성 | `make:event` | 이벤트 클래스 | ❌ |
| 생성 | `make:listener --event=` | 리스너 + 이벤트 함께 생성 | ✅ (부분) |
| 생성 | `make:exception` | 예외 클래스 | ❌ |
| 생성 | `make:command` | ACE 명령어 생성 | ❌ |
| 생성 | `make:provider` | 서비스 프로바이더 | ❌ |
| 생성 | `make:preload` | 프리로드 파일 | ❌ |
| 생성 | `make:test --suite=` | 특정 스위트 테스트 생성 | ❌ |
| 생성 | `make:mail --intent=` | 메일 클래스 (커스텀 의도) | ❌ |
| 생성 | `make:policy` | Bouncer 정책 | ❌ |
| 생성 | `make:view` | Edge.js 템플릿 | ❌ |
| 생성 | `eject` | 패키지 스텁 → 앱 스텁 디렉토리로 복사 | ❌ **High Value** |
| 생성 | `generate:key` | APP_KEY 생성 → .env 자동기록 | ❌ |
| 환경 | `env:add` | .env + .env.example + 검증규칙 한번에 | ❌ **High Value** |
| 검사 | `list:routes --json --table --middleware` | 라우트 + 미들웨어 필터 | ❌ |
| 검사 | `inspect:rcfile` | 설정 파일 최종 병합본 출력 | ❌ |

### 2.4 NestJS (`nest`)

| 카테고리 | 명령어 | 설명 | NexusTS |
|---------|--------|------|---------|
| 생성 | `generate module` | 모듈 생성 | ✅ |
| 생성 | `generate controller` | 컨트롤러 생성 | ✅ |
| 생성 | `generate service` | 서비스 생성 | ✅ |
| 생성 | `generate class` | 일반 클래스 | ❌ |
| 생성 | `generate decorator` | 데코레이터 생성 | ❌ |
| 생성 | `generate filter` | 예외 필터 | ❌ |
| 생성 | `generate guard` | 가드 생성 | ❌ |
| 생성 | `generate interceptor` | 인터셉터 생성 | ❌ |
| 생성 | `generate pipe` | 파이프 생성 | ❌ |
| 생성 | `generate middleware` | 미들웨어 생성 | ✅ |
| 생성 | `generate gateway` | WebSocket 게이트웨이 | ❌ |
| 생성 | `generate resolver` | GraphQL 리졸버 | ❌ |
| 생성 | `generate resource` | CRUD 리소스 (REST + GraphQL 선택) | ✅ (REST only) |
| 생성 | `generate library` | 모노레포 라이브러리 | ❌ |
| 생성 | `generate interface` | 인터페이스 | ❌ |
| 빌드 | `build --builder swc --watch` | 빌더 선택(SWC/tsc/webpack) + watch | ❌ |
| 시작 | `start --debug --watch` | 개발 서버 + 디버그 | ❌ |
| 설치 | `add` | nest library 설치 | ❌ |
| 정보 | `info` | 패키지 버전 + 시스템 정보 | ✅ |

---

## 3. 차별화 분석: NexusTS에 **반드시** 필요한 기능 (Priority 1)

다음 기능은 모든 경쟁 프레임워크가 공통으로 제공하며, 사용자 경험에 직접적 영향을 미침.

### P1-Critical: `nx serve` / `nx dev` — 개발 서버 명령어

**Rails** `bin/rails server` / **Laravel** `php artisan serve` / **AdonisJS** `node ace serve` / **NestJS** `nest start --watch`

- 현재 `bun run dev` (or `bun --hot app/main.ts`) 에 의존
- CLI가 Bun의 HMR/Hot Reload를 제어할 수 있어야 함
- `--port`, `--host`, `--debug`, `--hmr`, `--watch` 플래그 필요

### P1-Critical: `nx destroy` / `nx d` — 생성의 역연산

**Rails** `bin/rails destroy` / 모든 프레임워크가 지원

- `nx make:controller User` 로 만든 파일들을 한번에 삭제
- `nx d controller User` → controller, test, route 등을 정리
- 파일 생성 로그를 `.nx-scaffold-log` 에 저장해두고 destroy 시 참조

### P1-Critical: `nx build` — 프로덕션 빌드

**AdonisJS** `node ace build` / **NestJS** `nest build --builder swc`

- 현재 `bun run build` (`build.ts`) 에 의존
- `--minify`, `--sourcemap`, `--outdir`, `--target` 플래그
- Bun.build와 tsc 타입체크를 통합
- `--watchAssets` (non-TS 파일 watch)

### P1-High: `nx db:rollback` / `nx db:migrate:status` — DB 롤백 + 상태

**Rails** `db:rollback STEP=n` / `db:migrate:status` / `db:migrate:redo`

- Drizzle Kit 기반 롤백 명령어 (Drizzle Kit이 지원)
- 마이그레이션 상태 테이블 출력

### P1-High: `nx db:create` / `nx db:drop` — DB 생성/삭제

**Rails** `db:create` / `db:drop` / **Laravel** `db:wipe`

- 설정에서 DATABASE_URL 읽어 DB 생성/삭제
- `--if-exists`, `--force` 플래그

### P1-High: `nx make:resource` — Rails-style resource

**Rails** `generate resource` / **NestJS** `generate resource`

- `make:crud` 와 달리 뷰/스캐폴드 없이 모델+컨트롤러+라우트+마이그레이션만
- API 전용 리소스 생성에 적합

---

## 4. 사용자 경험을 크게 개선할 기능 (Priority 2)

### P2-Medium: `nx add <package>` — 원스텝 설치 + 설정

**AdonisJS** `node ace add @adonisjs/lucid` / **NestJS** `nest add`

- `bun add @nexusts/<pkg>` + 자동 configure 한방에
- 설치 후 `nx.config.ts` 자동 수정 (예: `@nexusts/cache` 추가시 캐시 설정)
- `--dev` (devDependency), `--force` (파일 덮어쓰기) 플래그

### P2-Medium: `nx make:exception` / `nx make:filter` — 예외/필터 생성

**AdonisJS** `make:exception` / **NestJS** `generate filter`

- 커스텀 예외 클래스 생성
- HTTP 예외 필터 생성

### P2-Medium: `nx make:event` + `nx make:listener --event=` — 이벤트 생성

**AdonisJS** `make:event` / `make:listener --event=` / **Laravel** `make:event` / `make:listener`

- 이벤트 클래스와 리스너를 함께 생성하는 옵션
- 기존 `make:listener` 보강

### P2-Medium: `nx make:job` — 큐 잡 생성

**Laravel** `make:job` / **Rails** `generate job`

- 큐에서 실행할 Job 클래스 생성
- `@nexusts/queue` 와 연동

### P2-Medium: `nx make:gateway` — WebSocket 게이트웨이

**NestJS** `generate gateway`

- `@WebSocketGateway` 데코레이터가 적용된 게이트웨이 클래스
- `@nexusts/ws` 와 연동

### P2-Medium: `nx make:guard` / `nx make:interceptor` / `nx make:pipe` — NestJS 스타일

**NestJS** `generate guard` / `generate interceptor` / `generate pipe`

- 가드: `@Injectable()` + `CanActivate` 인터페이스
- 인터셉터: `@Injectable()` + 변환 로직
- 파이프: `@Injectable()` + `PipeTransform` 인터페이스

### P2-Medium: `nx make:test --suite=` — 특정 스위트 테스트 생성

**AdonisJS** `make:test --suite=unit`

- `tests/unit/`, `tests/feature/`, `tests/e2e/` 스위트 선택
- 단독 `make:test` 명령어 (현재는 CRUD 스캐폴드에만 포함)

### P2-Medium: `nx route:list --middleware --json --table`

**AdonisJS** `list:routes --middleware --json --table`

- 미들웨어 필터링
- JSON 출력 포맷
- 컨트롤러별/메소드별 grouping

### P2-Medium: `nx middleware` — 미들웨어 스택 출력

**Rails** `bin/rails middleware`

- 앱에 등록된 미들웨어 체인 출력
- 어떤 요청이 어떤 미들웨어를 통과하는지 디버깅

### P2-Medium: `nx generate:key` — APP_KEY/시크릿 생성

**AdonisJS** `generate:key` / **Rails** `secret`

- 암호학적으로 안전한 랜덤 키 생성
- `.env` 파일에 자동 기록 (또는 `--show` 로 터미널 출력)

---

## 5. "있으면 좋은" 기능 (Priority 3)

### P3: `nx env:add` — 환경 변수 추가 + 검증 규칙

**AdonisJS** `env:add`

- `.env` + `.env.example` + `start/env.ts` 검증규칙 한번에
- `--type=string|boolean|number|enum`

### P3: `nx stub:publish` / `nx eject` — 스텁 커스터마이징

**Laravel** `stub:publish` / **AdonisJS** `eject`

- 내장 템플릿 스텁을 사용자 프로젝트로 복사
- 사용자가 커스텀 스텁을 수정하면 `nx make:controller` 등에 반영

### P3: `nx db:reset` / `nx db:setup` / `nx db:prepare`

**Rails** `db:reset` / `db:setup` / `db:prepare`

- `db:reset`: drop + create + migrate + seed
- `db:setup`: create + schema load + seed
- `db:prepare`: DB 없으면 setup, 있으면 migrate

### P3: `nx db:seed:replant` — truncate + seed 한방에

### P3: `nx dbconsole` — DB 네이티브 콘솔 접속

**Rails** `dbconsole` / alias `db`

- `sqlite3 app.db` / `psql -U user db` 등을 자동 실행

### P3: `nx make:notification` — 알림 클래스 생성

**Laravel** `make:notification`

### P3: `nx make:mail` — 메일 클래스 생성

**AdonisJS** `make:mail --intent=`

### P3: `nx make:policy` — 인가 정책 생성

**AdonisJS** `make:policy` / **Laravel** `make:policy`

### P3: `nx make:provider` — 서비스 프로바이더 생성

**AdonisJS** `make:provider --environments=`

### P3: `nx make:decorator` — 커스텀 데코레이터 생성

**NestJS** `generate decorator`

### P3: `nx make:resolver` — GraphQL 리졸버 생성

**NestJS** `generate resolver`

### P3: `nx make:enum` — Enum 생성 (TypeScript union + Zod)

**Laravel** `make:enum`

### P3: `nx make:command` — CLI 명령어 생성

**AdonisJS** `make:command` / **Laravel** `make:command`

- 사용자 정의 `nx` 명령어 스캐폴드

### P3: `nx make:helper` — 헬퍼/유틸리티 생성

**Rails** `generate helper`

### P3: `nx make:observer` — 모델 옵저버 생성

**Laravel** `make:observer`

### P3: `nx runner` — 스크립트 실행기

**Rails** `runner` / `runner --skip-executor`

- `nx runner scripts/seed-users.ts`
- 앱 컨텍스트에서 임의 스크립트 실행

### P3: `nx notes` — TODO/FIXME 검색

**Rails** `notes --annotations FIXME,OPTIMIZE`

### P3: `nx stats` — LOC 통계

**Rails** `stats`

### P3: `nx optimize` / `nx config:cache` — 성능 최적화

**Laravel** `config:cache` / `route:cache` / `optimize`

- 설정 캐싱 (읽기 전용 프로덕션 환경)
- 라우트 캐싱
- 뷰 캐싱

### P3: `nx about` — 버전 정보 (NestJS 스타일)

**NestJS** `info` (ASCII 로고 + 버전 트리)

- 현재 `nx info`는 config 위주 → `nx about` 분리
- ASCII 로고 + OS/Node/Bun/패키지 버전 트리

### P3: `nx tmp:clear` — 임시 파일 정리

**Rails** `tmp:clear`

- `.nx-repl-history`, `dist/`, 임시 빌드 파일 정리

### P3: REPL 개선 — `.runner` / `.about` / `.db` 명령어

**Laravel Tinker** / **Rails Console** 고급 기능

- `.runner <path>`: REPL 안에서 외부 스크립트 실행
- `.about`: REPL 세션 정보
- `.db`: 바로 DB 콘솔로 전환

### P3: 자동완성 지원 — `--bash-completion` / PowerShell

- Shell 자동완성 스크립트 생성
- `nx` + Tab → 명령어 목록
- `nx make:` + Tab → 컨트롤러/서비스/모델 등

---

## 6. 현재 CLI의 내부 구조 개선사항

| 영역 | 문제 | 개선안 |
|------|------|--------|
| **명령어 등록** | `commands/index.ts`에서 수동 배열 | 데코레이터 기반 자동등록 (`@Command({name, aliases})`) |
| **Args 파서** | 수동 `parseArgs()` (풍부하지 않음) | `yargs` / `commander` / `clack` 도입 또는 자체 파서 개선 (subcommand, `--flag=value`, `--no-flag`) |
| **프롬프트** | `readline` 기반 (초라함) | `@clack/prompts` 또는 `ink` 기반 modern 프롬프트 (spinner, multiselect, search) |
| **출력 포맷** | 수동 ANSI | `clack`/`ink` 도입으로 프로그레스바, 스피너, 테이블 개선 |
| **설정 로드** | `loadConfig()` 수동 | 설정 캐싱 + 스키마 검증 (Zod) |
| **테스트** | 명령어별 테스트 파일 있음 (`tests/cli/`) | 단위 테스트 커버리지 확대 (현재 6개 파일) |
| **오류 처리** | `try/catch` + `logger.error()` | 구조화된 오류 코드 + 제안 메시지 |
| **인터랙션 감지** | `--no-interaction` 플래그 | Laravel-style `PromptsForMissingInput` 인터페이스 도입 |

---

## 7. 최종 우선순위 요약

### 🔴 P1 — 반드시 (MVP)

1. `nx serve` / `nx dev` — 개발 서버 (HMR)
2. `nx destroy` — 생성 역연산
3. `nx build` — 프로덕션 빌드
4. `nx db:rollback` / `nx db:migrate:status`
5. `nx db:create` / `nx db:drop`
6. `nx make:resource` — API 리소스 전용

### 🟠 P2 — 크게 개선

7. `nx add <package>` — 원스텝 설치
2. `nx make:exception` / `nx make:filter`
3. `nx make:event` (리스너와 함께)
4. `nx make:job`
5. `nx make:gateway` (WebSocket)
6. `nx make:guard` / `nx make:interceptor` / `nx make:pipe`
7. `nx make:test --suite=`
8. `nx route:list` — 미들웨어/JSON/그룹핑 개선
9. `nx middleware` — 미들웨어 스택 출력
10. `nx generate:key`
11. 프롬프트 시스템 개선 (`@clack/prompts`)
12. 명령어 자동완성 스크립트

### 🟢 P3 — Nice to have

19. `nx env:add` / `nx stub:publish` / `nx eject`
2. `nx db:reset` / `nx db:setup` / `nx db:prepare` / `nx db:seed:replant` / `nx dbconsole`
3. `nx make:notification` / `nx make:mail` / `nx make:policy` / `nx make:provider`
4. `nx make:decorator` / `nx make:resolver` / `nx make:enum`
5. `nx make:command`
6. `nx make:helper` / `nx make:observer`
7. `nx runner` / `nx notes` / `nx stats`
8. `nx optimize` / `nx config:cache`
9. `nx about` (ASCII 로고 + 버전 트리)
10. `nx tmp:clear`
11. REPL 개선 (`.runner`, `.db`)
12. Args 파서 개선 (`yargs`/`commander` 도입)

---

## 8. 권장 진행 순서

### Phase 1 (`feat/cli-enhancements` 브랜치에서 진행)

1. **`nx serve`** 구현 (Bun HMR 래핑) — 가장 임팩트 큼
2. **`nx destroy`** 구현 (스캐폴드 로그 기반)
3. **Args 파서 개선** (서브커맨드, `--flag=value` 정식 지원)
4. **프롬프트 개선** (`@clack/prompts` 도입)

### Phase 2 (동일 브랜치 또는 별도 브랜치)

1. **`nx build`** 구현
2. **`nx add <package>`** 구현
3. **DB 명령어 보강** (`rollback`, `status`, `create`, `drop`)
4. **`make:resource`** 추가

### Phase 3

1. P2-P3 나머지 명령어들
2. 명령어 자동등록 시스템
3. 자동완성
4. 설정 캐싱/최적화

---

*이 문서는 `feat/cli-enhancements` 브랜치에서 실험적으로 작성되었습니다.*
