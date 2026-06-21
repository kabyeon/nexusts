# NexusJS Documentation

Welcome to the NexusJS documentation. NexusJS is a **Bun-native fullstack
framework** that combines the structure of NestJS, the productivity of
AdonisJS, and the edge performance of Hono.

이 문서는 영어가 기본(original)이며, 한국어 버전은 `*.ko.md` 파일로 제공됩니다.
This documentation is primarily in English; Korean translations are
provided in `*.ko.md` files.

> **Current version: v0.4** — observability & DX. All Tier 1
> and Tier 2 gaps from the NestJS / AdonisJS gap analyses are
> closed. 22 modules. See [`../CHANGELOG.md`](../CHANGELOG.md) for
> the release notes.

---

## 目录 / 목차

| Section | English | 한국어 |
| ------- | ------- | ------ |
| **Changelog** (변경 로그) | [`../CHANGELOG.md`](../CHANGELOG.md) | [`../CHANGELOG.ko.md`](../CHANGELOG.ko.md) |
| **Design documents** (아키텍처 · 설계) | [`docs/design/`](./design/) | [`docs/design/`](./design/) (`*.ko.md`) |
| **User guide** (사용자 메뉴얼) | [`docs/user-guide/`](./user-guide/) | [`docs/user-guide/`](./user-guide/) (`*.ko.md`) |
| **Analysis** (분석 · 비교) | [`docs/analysis/`](./analysis/) | [`docs/analysis/`](./analysis/) (`*.ko.md`) |
| **API reference** (API 레퍼런스) | [`api-reference.md`](./api-reference.md) | [`api-reference.ko.md`](./api-reference.ko.md) |

---

## Modules shipped in v0.5 (26 total)

Every module is its own bundle entry point. Install only what you use.

| Module | Import path | Bundle subpath | Doc |
| ------ | ----------- | --------------- | --- |
| Core | `nexus` | `nexus` | (this folder) |
| CLI | `nexus/cli` | `nx` | [`user-guide/cli.md`](./user-guide/cli.md) |
| Auth | `nexus/auth` | `nexus/auth` | [`user-guide/auth.md`](./user-guide/auth.md) |
| Queue | `nexus/queue` | `nexus/queue` | [`user-guide/queue.md`](./user-guide/queue.md) |
| Schedule | `nexus/schedule` | `nexus/schedule` | [`user-guide/schedule.md`](./user-guide/schedule.md) |
| Events | `nexus/events` | `nexus/events` | [`user-guide/events.md`](./user-guide/events.md) |
| Session | `nexus/session` | `nexus/session` | [`user-guide/session.md`](./user-guide/session.md) |
| **Health** | `nexus/health` | `nexus/health` | [`user-guide/production-basics.md`](./user-guide/production-basics.md) |
| **Config** | `nexus/config` | `nexus/config` | [`user-guide/production-basics.md`](./user-guide/production-basics.md) |
| **Logger** | `nexus/logger` | `nexus/logger` | [`user-guide/production-basics.md`](./user-guide/production-basics.md) |
| **Static** | `nexus/static` | `nexus/static` | [`user-guide/production-basics.md`](./user-guide/production-basics.md) |
| **Limiter** | `nexus/limiter` | `nexus/limiter` | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) |
| **Shield** | `nexus/shield` | `nexus/shield` | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) |
| **Cache** | `nexus/cache` | `nexus/cache` | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) |
| **Drive** | `nexus/drive` | `nexus/drive` | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) |
| **Mail** | `nexus/mail` | `nexus/mail` | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) |
| **Drizzle** | `nexus/drizzle` | `nexus/drizzle` | [`user-guide/drizzle.md`](./user-guide/drizzle.md) |
| **OpenAPI** *(v0.4)* | `nexus/openapi` | `nexus/openapi` | [`user-guide/openapi.md`](./user-guide/openapi.md) |
| **Upload** *(v0.4)* | `nexus/upload` | `nexus/upload` | [`user-guide/upload.md`](./user-guide/upload.md) |
| **SSE** *(v0.4)* | `nexus/sse` | `nexus/sse` | [`user-guide/sse.md`](./user-guide/sse.md) |
| **Tracing** *(v0.4)* | `nexus/tracing` | `nexus/tracing` | [`user-guide/tracing.md`](./user-guide/tracing.md) |
| **Metrics** *(v0.4)* | `nexus/metrics` | `nexus/metrics` | [`user-guide/metrics.md`](./user-guide/metrics.md) |
| **Request-scoped DI** *(v0.4)* | `nexus` (core) | `nexus/core` | [`user-guide/request-scope.md`](./user-guide/request-scope.md) |
| **WebSockets** *(v0.5)* | `nexus/ws` | `nexus/ws` | [`user-guide/ws.md`](./user-guide/ws.md) |
| **Crypto** *(v0.5)* | `nexus/crypto` | `nexus/crypto` | [`user-guide/crypto.md`](./user-guide/crypto.md) |
| **i18n** *(v0.5)* | `nexus/i18n` | `nexus/i18n` | [`user-guide/i18n.md`](./user-guide/i18n.md) |
| **Redis client** *(v0.5)* | `nexus/redis` | `nexus/redis` | [`user-guide/redis.md`](./user-guide/redis.md) |

---

## User guide · 사용자 메뉴얼

Step-by-step guides for building applications.
애플리케이션 개발을 위한 단계별 가이드.

| Guide | English | 한국어 |
| ----- | ------- | ------ |
| Getting started | [`user-guide/getting-started.md`](./user-guide/getting-started.md) | [`user-guide/getting-started.ko.md`](./user-guide/getting-started.ko.md) |
| Controllers & decorators | [`user-guide/controllers.md`](./user-guide/controllers.md) | [`user-guide/controllers.ko.md`](./user-guide/controllers.ko.md) |
| Dependency injection | [`user-guide/dependency-injection.md`](./user-guide/dependency-injection.md) | [`user-guide/dependency-injection.ko.md`](./user-guide/dependency-injection.ko.md) |
| Validation | [`user-guide/validation.md`](./user-guide/validation.md) | [`user-guide/validation.ko.md`](./user-guide/validation.ko.md) |
| View engines | [`user-guide/view-engines.md`](./user-guide/view-engines.md) | [`user-guide/view-engines.ko.md`](./user-guide/view-engines.ko.md) |
| Inertia.js adapter | [`user-guide/inertia.md`](./user-guide/inertia.md) | [`user-guide/inertia.ko.md`](./user-guide/inertia.ko.md) |
| **Authentication (better-auth)** | [`user-guide/auth.md`](./user-guide/auth.md) | [`user-guide/auth.ko.md`](./user-guide/auth.ko.md) |
| **Queue (BullMQ / Cloudflare Queues)** | [`user-guide/queue.md`](./user-guide/queue.md) | [`user-guide/queue.ko.md`](./user-guide/queue.ko.md) |
| **Schedule · `@Cron` decorator** | [`user-guide/schedule.md`](./user-guide/schedule.md) | [`user-guide/schedule.ko.md`](./user-guide/schedule.ko.md) |
| **Event System** | [`user-guide/events.md`](./user-guide/events.md) | [`user-guide/events.ko.md`](./user-guide/events.ko.md) |
| **Session (cookie / memory / Drizzle)** | [`user-guide/session.md`](./user-guide/session.md) | [`user-guide/session.ko.md`](./user-guide/session.ko.md) |
| **Production basics (health / config / logger / static)** | [`user-guide/production-basics.md`](./user-guide/production-basics.md) | [`user-guide/production-basics.ko.md`](./user-guide/production-basics.ko.md) |
| **Cross-cutting (limiter / shield / cache / drive / mail)** | [`user-guide/cross-cutting-features.md`](./user-guide/cross-cutting-features.md) | [`user-guide/cross-cutting-features.ko.md`](./user-guide/cross-cutting-features.ko.md) |
| **Drizzle ORM (default ORM)** | [`user-guide/drizzle.md`](./user-guide/drizzle.md) | [`user-guide/drizzle.ko.md`](./user-guide/drizzle.ko.md) |
| Runtime & deployment | [`user-guide/runtime-deployment.md`](./user-guide/runtime-deployment.md) | [`user-guide/runtime-deployment.ko.md`](./user-guide/runtime-deployment.ko.md) |
| **CLI · `nx` command runner** | [`user-guide/cli.md`](./user-guide/cli.md) | [`user-guide/cli.ko.md`](./user-guide/cli.ko.md) |
| **OpenAPI** *(v0.4)* | [`user-guide/openapi.md`](./user-guide/openapi.md) | [`user-guide/openapi.ko.md`](./user-guide/openapi.ko.md) |
| **Upload** *(v0.4)* | [`user-guide/upload.md`](./user-guide/upload.md) | [`user-guide/upload.ko.md`](./user-guide/upload.ko.md) |
| **SSE** *(v0.4)* | [`user-guide/sse.md`](./user-guide/sse.md) | [`user-guide/sse.ko.md`](./user-guide/sse.ko.md) |
| **Tracing** *(v0.4)* | [`user-guide/tracing.md`](./user-guide/tracing.md) | [`user-guide/tracing.ko.md`](./user-guide/tracing.ko.md) |
| **Metrics** *(v0.4)* | [`user-guide/metrics.md`](./user-guide/metrics.md) | [`user-guide/metrics.ko.md`](./user-guide/metrics.ko.md) |
| **Request-scoped DI** *(v0.4)* | [`user-guide/request-scope.md`](./user-guide/request-scope.md) | [`user-guide/request-scope.ko.md`](./user-guide/request-scope.ko.md) |
| **WebSockets** *(v0.5)* | [`user-guide/ws.md`](./user-guide/ws.md) | [`user-guide/ws.ko.md`](./user-guide/ws.ko.md) |
| **Crypto** *(v0.5)* | [`user-guide/crypto.md`](./user-guide/crypto.md) | [`user-guide/crypto.ko.md`](./user-guide/crypto.ko.md) |
| **i18n** *(v0.5)* | [`user-guide/i18n.md`](./user-guide/i18n.md) | [`user-guide/i18n.ko.md`](./user-guide/i18n.ko.md) |
| **Redis client** *(v0.5)* | [`user-guide/redis.md`](./user-guide/redis.md) | [`user-guide/redis.ko.md`](./user-guide/redis.ko.md) |

---

## Design documents · 설계 문서

Architectural deep-dives for contributors and advanced users.
기여자 및 고급 사용자를 위한 아키텍처 심층 문서.

| Document | English | 한국어 |
| -------- | ------- | ------ |
| Architecture overview | [`design/architecture.md`](./design/architecture.md) | [`design/architecture.ko.md`](./design/architecture.ko.md) |
| DI container design | [`design/di-container.md`](./design/di-container.md) | [`design/di-container.ko.md`](./design/di-container.ko.md) |
| Inertia adapter design | [`design/inertia-adapter.md`](./design/inertia-adapter.md) | [`design/inertia-adapter.ko.md`](./design/inertia-adapter.ko.md) |
| Auth module design | [`design/auth.md`](./design/auth.md) | [`design/auth.ko.md`](./design/auth.ko.md) |
| Queue module design | [`design/queue.md`](./design/queue.md) | [`design/queue.ko.md`](./design/queue.ko.md) |
| Schedule module design | [`design/schedule.md`](./design/schedule.md) | [`design/schedule.ko.md`](./design/schedule.ko.md) |
| Session module design | [`design/session.md`](./design/session.md) | [`design/session.ko.md`](./design/session.ko.md) |

---

## Analysis · 비교 분석

| Comparison | English | 한국어 |
| ---------- | ------- | ------ |
| NestJS feature gap | [`analysis/nestjs-comparison.md`](./analysis/nestjs-comparison.md) | [`analysis/nestjs-comparison.ko.md`](./analysis/nestjs-comparison.ko.md) |
| AdonisJS feature gap | [`analysis/adonisjs-comparison.md`](./analysis/adonisjs-comparison.md) | [`analysis/adonisjs-comparison.ko.md`](./analysis/adonisjs-comparison.ko.md) |

---

## Quick links · 바로가기

- **Repository layout** — see [`../README.md`](../README.md)
- **Source structure** — [`src/core/`](../src/core/) and the 17 module folders
- **Tests** — [`../tests/`](../tests/)
- **Changelog** — [`../CHANGELOG.md`](../CHANGELOG.md)

---

## Conventions · 작성 규칙

- Code samples target **Bun ≥ 1.1** by default. Node/Cloudflare notes are
  called out explicitly when relevant.
- TypeScript is the only supported language. Decorators require
  `experimentalDecorators: true` in `tsconfig.json`.
- All examples import from the public entry point (`nexus`,
  `nexus/drizzle`, `nexus/cache`, etc.) unless they intentionally
  demonstrate a deep-import.

---

## Versioning · 버전 정책

| Version | Status | Notes |
| ------- | ------ | ----- |
| **v0.1** | ✅ Shipped 2026-04-30 | MVC core, DI, validation, Rendu/Edge/Inertia adapters |
| **v0.2** | ✅ Shipped 2026-05-15 | Session auth, BullMQ queue, event system, scheduler, CLI |
| **v0.3** | ✅ Shipped 2026-06-21 | Production basics, cross-cutting, Drizzle ORM (default) |
| **v0.4** | ✅ Shipped 2026-06-22 | Observability (openapi, upload, sse, tracing, metrics) + request-scoped DI |
| **v0.5** | ✅ **Current** | `nexus/ws` (Hono WebSocket integration, Bun + Node) + `nexus/crypto` (encryption + hashing) |
| v1.0 | Planned | `nexus/i18n`, AI agent module, production hardening, stable public API |

The framework follows [Semantic Versioning](https://semver.org/). Until
v1.0, minor version bumps may include breaking changes. See
[`../CHANGELOG.md`](../CHANGELOG.md) for the full release history.
