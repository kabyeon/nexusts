---
title: 모듈 개요
description: 모든 33개 @nexusts/* 모듈
---

# 모듈 개요

NexusTS는 `@nexusts/*` 네임스페이스로 **33개 독립 패키지**를 제공합니다. 필요한 것만 설치할 수 있습니다.

## 코어

| 패키지 | 설명 |
|--------|------|
| `@nexusts/core` | MVC + DI + 라우팅 + 검증 + 뷰. 프레임워크 코어. |
| `@nexusts/cli` | `nx` 명령어 러너. 스캐폴딩, 생성기, REPL, 라우트 인스펙터. |

## 데이터베이스

| 패키지 | 설명 |
|--------|------|
| `@nexusts/drizzle` | 기본 ORM. 5개 방언 (postgres, mysql, sqlite, bun-sqlite, d1). |
| `@nexusts/kysely` | 타입 안전 SQL 쿼리 빌더. `KyselyService`, `KyselyRepository` (Lucid 스타일), `KyselyModule.forRoot()`. 내장 `Migrator`. 모든 Kysely 방언. |

## API & 통신

| 패키지 | 설명 |
|--------|------|
| `@nexusts/graphql` | SDL 우선 + 코드 퍼스트 GraphQL. `@Resolver`/`@Query`/`@Mutation`/`@Arg` 데코레이터. |
| `@nexusts/grpc` | 리플렉션 기반 gRPC 서버 + 타입드 클라이언트. 4가지 통신 방식. |
| `@nexusts/ws` | WebSocket 게이트웨이. |
| `@nexusts/sse` | Server-Sent Events. |
| `@nexusts/openapi` | OpenAPI 3.1 스펙 생성 + Scalar UI. |

## Resilience

| 패키지 | 설명 |
|--------|------|
| `@nexusts/resilience` | Retry + Circuit Breaker + Bulkhead. 크로스-팟 저장소. HTTP 관리 API. |
| `@nexusts/feature-flag` | 카나리 / A/B 테스트. `@FeatureFlag()` 가드 데코레이터. |

## 프론트엔드

| 패키지 | 설명 |
|--------|------|
| `@nexusts/view` | Inertia.js v3 (React/Vue SPA + SSR), Rendu, Edge, Eta. |

## 보안

| 패키지 | 설명 |
|--------|------|
| `@nexusts/auth` | better-auth 통합. |
| `@nexusts/shield` | CSRF + HSTS + CSP + CORS. |
| `@nexusts/limiter` | 속도 제한. 3가지 전략. |
| `@nexusts/session` | 세션 관리. |

## 관측 가능성

| 패키지 | 설명 |
|--------|------|
| `@nexusts/logger` | 구조화된 로깅 (Pino). |
| `@nexusts/metrics` | Prometheus 메트릭. |
| `@nexusts/tracing` | OpenTelemetry 트레이싱. |

## 인프라

| 패키지 | 설명 |
|--------|------|
| `@nexusts/cache` | 애플리케이션 캐시. Memory / Drizzle / Redis. |
| `@nexusts/config` | 환경 설정 관리. |
| `@nexusts/crypto` | 암호화 + 해싱. |
| `@nexusts/drive` | 파일 저장소 추상화. |
| `@nexusts/events` | 이벤트 시스템. |
| `@nexusts/health` | 헬스 체크. |
| `@nexusts/i18n` | 국제화. |
| `@nexusts/mail` | 아웃바운드 이메일. |
| `@nexusts/queue` | 작업 큐. |
| `@nexusts/redis` | Redis 클라이언트. |
| `@nexusts/schedule` | Cron / Interval / Timeout 스케줄러. |
| `@nexusts/static` | 정적 파일 서빙. |
| `@nexusts/upload` | 파일 업로드 헬퍼. |
