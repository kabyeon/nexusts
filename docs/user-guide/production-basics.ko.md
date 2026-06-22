# Production Basics · health, config, logger, static

> English version: [`production-basics.md`](./production-basics.md)

v0.3에서 출시되는 네 모듈 — `@kabyeon/nexusjs/health`, `@kabyeon/nexusjs/config`,
`@kabyeon/nexusjs/logger`, `@kabyeon/nexusjs/static` — 모든 NestJS / AdonisJS 백엔드가
당연하다고 여기는 **production basics**이다. 같은 패키지 경계
(번들의 별도 진입점)와 같은 DI 패턴(`Module.forRoot({...})`)을 공유한다.

---

## 1. `@kabyeon/nexusjs/health` — 헬스 체크

Kubernetes, 로드밸런서, 운영 대시보드를 위한 liveness / readiness /
startup 엔드포인트. 균일한 `HealthIndicator` 인터페이스 기반.

### 빠른 시작

```ts
// app/app.module.ts
import { Module } from '@kabyeon/nexusjs';
import { HealthModule } from '@kabyeon/nexusjs/health';

@Module({
  imports: [
    HealthModule.forRoot({
      builtIn: {
        memory: true,
        disk: { threshold: 0.1 },
        http: { url: 'https://api.stripe.com/v1/healthcheck' },
      },
    }),
  ],
})
export class AppModule {}
```

엔드포인트 (내장 컨트롤러가 자동 마운트):

| 경로 | 용도 | 응답 |
| ---- | ------- | -------- |
| `GET /health/live` | K8s liveness probe (프로세스 살아있음) | up이면 200 |
| `GET /health/ready` | K8s readiness probe (의존성 정상) | 하나라도 down이면 503 |
| `GET /health/startup` | K8s startup probe (초기화 완료) | ready와 동일 |

응답 본문:

```json
{
  "status": "up",
  "results": [
    { "name": "memory", "result": { "status": "up", "data": { "ratio": 0.45 } } },
    { "name": "disk",   "result": { "status": "up", "data": { "freeRatio": 0.62 } } }
  ],
  "durationMs": 3,
  "timestamp": "2026-06-20T12:00:00.000Z"
}
```

### 내장 indicator

| Indicator | 실패 조건 |
| --------- | ------------- |
| `MemoryHealthIndicator` | Heap 사용률 > threshold (기본 90%) |
| `DiskHealthIndicator`   | 여유 디스크 < threshold (기본 10%) |
| `HttpHealthIndicator`   | GET이 2xx 외 응답 또는 timeout |

### 커스텀 indicator

```ts
import { Inject, Injectable } from '@kabyeon/nexusjs';
import { HealthCheckService, HealthIndicator } from '@kabyeon/nexusjs/health';
import type { HealthIndicatorResult } from '@kabyeon/nexusjs/health';

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator {
  readonly name = 'database';
  constructor(@Inject('DB') private db: Db) {}
  async check(): Promise<HealthIndicatorResult> {
    await this.db.ping();
    return { status: 'up' };
  }
}

// 부팅 시 등록:
const svc = app.container.resolve(HealthCheckService.TOKEN) as HealthCheckService;
svc.register(new DatabaseHealthIndicator(db));
```

---

## 2. `@kabyeon/nexusjs/config` — Zod 검증이 포함된 configuration

env 변수와 `.env` 파일에서 로드되고 Zod 스키마로 검증되는 타입 안전
설정. 검증 실패 시 throw (또는 `process.exit(1)`) — 잘못 구성된 배포가
빨리 실패하도록.

### 빠른 시작

```ts
// app/config/schema.ts
import { z } from 'zod';
export const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// app/app.module.ts
import { Module } from '@kabyeon/nexusjs';
import { ConfigModule } from '@kabyeon/nexusjs/config';
import { configSchema } from './config/schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: configSchema,
      exitOnError: process.env['NODE_ENV'] === 'production',
    }),
  ],
})
export class AppModule {}
```

### 서비스에서 사용

```ts
import { Inject, Injectable } from '@kabyeon/nexusjs';
import { ConfigService } from '@kabyeon/nexusjs/config';
import { configSchema } from '../config/schema.js';

@Injectable()
class DatabaseService {
  constructor(
    @Inject(ConfigService.TOKEN)
    private config: ConfigService<typeof configSchema>,
  ) {}

  connect() {
    return this.config.require('DATABASE_URL'); // 없으면 throw
  }

  start() {
    return this.config.get('PORT', { default: 3000 });
  }
}
```

클래스가 `typeof configSchema`로 파라미터화되므로 `config.get('DATABASE_URL')`은
수동 타입 어노테이션 없이 `string`을 반환한다.

### 레이어드 로딩

설정값은 다음 순서로 해석된다 (높을수록 우선):

```
1. process.env                    ← 런타임 오버라이드 (Docker/K8s/CI)
2. .env.{NODE_ENV}                ← 환경별 (예: .env.production)
3. .env.local                     ← 로컬 개발자 설정 (.gitignore 권장)
4. .env                            ← 공통 기본값 (git 커밋)
5. load() 정적 레이어             ← 최저 우선순위
```

### 환경별 `.env` 자동 로딩

기본적으로 `ConfigModule.forRoot()`는 `NODE_ENV`에 따라 환경별
파일을 자동 로드합니다:

| 파일 | 용도 | Git ? |
|------|------|-------|
| `.env` | 공통 기본값 (모든 환경) | ✅ 커밋 |
| `.env.local` | 로컬 오버라이드 (내 컴퓨터만) | ❌ `.gitignore` |
| `.env.development` | 개발 환경값 | ✅ 커밋 |
| `.env.production` | 프로덕션 시크릿 | ✅ 커밋 |
| `.env.testing` | 테스트 전용값 | ✅ 커밋 |

```ts
// .env.production 예제
DATABASE_URL=postgres://user:pass@prod:5432/myapp
LOG_LEVEL=warn
```

```ts
// .env.development 예제
DATABASE_URL=postgres://localhost:5432/myapp
LOG_LEVEL=debug
```

자동 로딩 비활성화 또는 경로 커스터마이즈:

```ts
ConfigModule.forRoot({
  schema: configSchema,
  // 명시적 파일 목록 (자동 감지 비활성화)
  envFilePaths: ['.env.custom', '/etc/secrets/.env'],

  // env 파일 로딩 완전 비활성화
  envFile: false,

  // NODE_ENV 재정의 (기본값: process.env.NODE_ENV)
  nodeEnv: process.env.APP_ENV ?? 'development',

  // 필수값 누락 시 즉시 실패
  exitOnError: process.env.NODE_ENV === 'production',
});
```

---

## 3. `@kabyeon/nexusjs/logger` — Pino 통합 구조화 로깅

Pino 통합 내장. dev에서는 pretty-print, prod에서는 JSON.
`AsyncLocalStorage`로 요청 스코프 — 요청 내의 모든 로그는 자동으로
`requestId` / `userId`를 포함.

### 빠른 시작

```ts
import { Module } from '@kabyeon/nexusjs';
import { LoggerModule } from '@kabyeon/nexusjs/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info', // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
      pretty: process.env.NODE_ENV !== 'production',
      base: { service: 'my-app' },
    }),
  ],
})
export class AppModule {}
```

### 서비스에서 사용

```ts
import { Inject, Injectable } from '@kabyeon/nexusjs';
import { Logger } from '@kabyeon/nexusjs/logger';

@Injectable()
class UserService {
  constructor(@Inject(Logger.TOKEN) private logger: Logger) {}

  async signUp(email: string) {
    this.logger.info({ email }, 'user signed up');
    try {
      // ...
    } catch (err) {
      this.logger.error({ err, email }, 'sign-up failed');
      throw err;
    }
  }
}
```

### 요청 스코프 컨텍스트

```ts
import { logger } from '@kabyeon/nexusjs/logger';

async function handle(request: Request) {
  await logger.with({ requestId: crypto.randomUUID() }, async () => {
    logger.info('processing'); // 자동으로 requestId 태깅
    // ...
  });
}
```

### Child logger

```ts
class OrderService {
  private logger: Logger;

  constructor(@Inject(Logger.TOKEN) base: Logger) {
    this.logger = base.child({ service: 'order' });
  }
}
```

### Transport

- **PinoTransport** (프로덕션 기본) — JSON 출력 via `pino`.
- **PrettyTransport** (개발 기본) — 색상 출력 via `pino-pretty`.
- **NullTransport** — 모두 버림 (테스트용).

---

## 4. `@kabyeon/nexusjs/static` — 정적 파일 서빙

적절한 `Content-Type`, ETag, `Cache-Control`, range request 지원으로
디렉토리에서 파일을 서빙. 경로 조작 방지.

### 빠른 시작

```ts
import { Module } from '@kabyeon/nexusjs';
import { StaticModule } from '@kabyeon/nexusjs/static';
import { resolve } from 'node:path';

@Module({
  imports: [
    StaticModule.forRoot({
      root: resolve('./public'),
      prefix: '/public',
      cacheControl: 'public, max-age=86400',
      index: 'index.html',
    }),
  ],
})
export class AppModule {}
```

### 수동 마운트 (선택)

SPA 폴백(매칭되지 않는 라우트에 `index.html` 서빙)을 위해 미들웨어를 직접 마운트:

```ts
import { Inject, Injectable } from '@kabyeon/nexusjs';
import { StaticService } from '@kabyeon/nexusjs/static';
import { Hono } from 'hono';

@Injectable()
class WebServer {
  constructor(@Inject(StaticService.TOKEN) private static: StaticService) {}

  build(): Hono {
    const app = new Hono();
    app.use('/assets/*', this.static.middleware());
    app.get('*', (c) => c.html('<h1>SPA</h1>')); // SPA 폴백
    return app;
  }
}
```

### 기능

- **경로 조작 방지** — `..`, 절대 경로, 드라이브 문자가 거부됨.
- **ETag** — `If-None-Match`가 파일 재읽기 없이 304 반환.
- **Range 요청** — `Range: bytes=0-1023`이 206 Partial Content 반환.
- **`index.html` 폴백** — 디렉토리 요청이 `index.html`로 해결됨.
- **MIME 추론** — `.html`, `.css`, `.js`, `.json`, `.png`, `.woff2` 등.

---

## 5. 종합 사용 예

일반적인 v0.3 앱 모듈:

```ts
import { Module } from '@kabyeon/nexusjs';
import { HealthModule } from '@kabyeon/nexusjs/health';
import { ConfigModule } from '@kabyeon/nexusjs/config';
import { LoggerModule } from '@kabyeon/nexusjs/logger';
import { StaticModule } from '@kabyeon/nexusjs/static';
import { AuthModule } from '@kabyeon/nexusjs/auth';
import { SessionModule } from '@kabyeon/nexusjs/session';
import { QueueModule } from '@kabyeon/nexusjs/queue';
import { ScheduleModule } from '@kabyeon/nexusjs/schedule';
import { EventsModule } from '@kabyeon/nexusjs/events';
import { configSchema } from './config/schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({ schema: configSchema, exitOnError: true }),
    LoggerModule.forRoot({ pretty: process.env.NODE_ENV !== 'production' }),
    HealthModule.forRoot({
      builtIn: { memory: true, disk: { threshold: 0.1 } },
    }),
    StaticModule.forRoot({ root: './public', prefix: '/public' }),
    AuthModule.forRoot({ /* ... */ }),
    SessionModule.forRoot({ /* ... */ }),
    QueueModule.forRoot({ /* ... */ }),
    ScheduleModule.forRoot({ /* ... */ }),
    EventsModule.forRoot(),
  ],
})
export class AppModule {}
```

---

## 6. 참고

- [`../design/queue.md`](../design/queue.md) — 자매 설계 문서
- [`../design/session.md`](../design/session.md) — session 모듈
- [`../analysis/nestjs-comparison.md`](../analysis/nestjs-comparison.md) — 이 모듈들이 필요한 이유
- [`../analysis/adonisjs-comparison.md`](../analysis/adonisjs-comparison.md) — Tier 1 우선순위
- [Pino 문서](https://getpino.io/) — 로거 백엔드
- [Zod 문서](https://zod.dev/) — config 스키마 검증기
