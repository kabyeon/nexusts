---
title: CLI 레퍼런스
description: NexusTS CLI (nx) 명령어 참조
---

# CLI 레퍼런스

`nx` CLI는 NexusTS의 명령어 러너입니다. AdonisJS Ace와 Laravel Artisan에서 영감을 받았습니다.

## 기본 사용법

```bash
nx <command> [args...]

# 도움말
nx help
nx <command> --help

# 버전
nx --version
```

## 프로젝트 명령어

### `nx init` / `nx i`

기존 디렉토리에 NexusTS 초기화 (비파괴적).

```bash
nx init [dir] [options]
nx init --style nest --view inertia --orm drizzle --db bun-sqlite --frontend react
```

| 플래그 | 설명 |
|--------|------|
| `--style` | 라우팅 스타일: `nest` / `adonis` / `functional` |
| `--view` | 뷰 엔진: `rendu` / `edge` / `eta` / `inertia` / `none` |
| `--orm` | ORM 드라이버: `drizzle` / `prisma` / `kysely` / `none` |
| `--db` | 데이터베이스: `bun-sqlite` / `node-sqlite` / `libsql` / `postgres` / `mysql` / `none` |
| `--frontend` | Inertia 프론트엔드: `react` / `vue` / `svelte` / `solid` |
| `--no-ssr` | Inertia SSR 비활성화 |
| `--force` | 기존 파일 덮어쓰기 |
| `--no-interaction` | 대화형 프롬프트 건너뛰기 |

### `nx new` / `nx n`

새 디렉토리에 NexusTS 프로젝트 생성.

```bash
nx new <name> [options]
nx new my-app --style nest --view inertia --orm drizzle --db bun-sqlite --frontend react
```

## 생성기 명령어

### `nx make:controller`

컨트롤러 클래스 생성.

```bash
nx make:controller User
```

### `nx make:service`

서비스 클래스 생성.

```bash
nx make:service User
```

### `nx make:crud`

전체 CRUD 스캐폴드 생성.

```bash
nx make:crud Post
nx make:crud Post --no-views
```

### `nx make:model`

Drizzle 모델 생성.

```bash
nx make:model User
```

### `nx make:migration`

데이터베이스 마이그레이션 생성.

```bash
nx make:migration create_users_table
```

## 데이터베이스 명령어

### `nx db:generate`

스키마에서 Drizzle 마이그레이션 생성.

```bash
nx db:generate
```

### `nx db:migrate`

마이그레이션 실행.

```bash
nx db:migrate
```

### `nx db:seed`

시드 파일 실행.

```bash
nx db:seed
nx db:seed --create users
```

## 디버그 명령어

### `nx route:list`

등록된 모든 라우트 보기.

```bash
nx route:list
```

### `nx repl`

대화형 디버그 콘솔.

```bash
nx repl
# .services — 등록된 서비스 목록
# .modules — 등록된 모듈 목록
# .routes — 등록된 라우트 목록
# .help — 사용 가능한 명령어
```

### `nx info`

시스템 진단 정보.

```bash
nx info
```

## 설정

NexusTS는 프로젝트 루트의 `nx.config.ts`로 설정합니다:

```ts
import { defineConfig } from '@nexusts/core';

export default defineConfig({
  routing: 'nest',
  view: 'rendu',
  viewPaths: 'resources/views',
  orm: 'drizzle',
  dbDriver: 'bun-sqlite',
  dbUrl: 'app.db',
});
```
