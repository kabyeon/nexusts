# Production Basics · health, config, logger, static

> 한국어 버전: [`production-basics.ko.md`](./production-basics.ko.md)

The four modules shipped in v0.3 — `@nexusts/health`, `@nexusts/config`,
`@nexusts/logger`, `@nexusts/static` — are the **production basics** that
every NestJS / AdonisJS backend takes for granted. They share the
same package boundary (separate entry point in the bundle) and the
same DI pattern (`Module.forRoot({...})`).

---

## 1. `@nexusts/health` — health checks

Liveness / readiness / startup endpoints for Kubernetes, load
balancers, and ops dashboards. Backed by a uniform `HealthIndicator`
interface.

### Quick start

```ts
// app/app.module.ts
import { Module } from '@nexusts/core';
import { HealthModule } from '@nexusts/health';

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

Endpoints (auto-mounted by the built-in controller):

| Path | Purpose | Response |
| ---- | ------- | -------- |
| `GET /health/live` | K8s liveness probe (process is alive) | 200 if up |
| `GET /health/ready` | K8s readiness probe (deps are healthy) | 503 if any indicator is down |
| `GET /health/startup` | K8s startup probe (initialization done) | same as ready |

Response body:

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

### Built-in indicators

| Indicator | When it fails |
| --------- | ------------- |
| `MemoryHealthIndicator` | Heap usage > threshold (default 90%) |
| `DiskHealthIndicator`   | Free disk < threshold (default 10%) |
| `HttpHealthIndicator`   | GET returns non-2xx or times out |

### Custom indicators

```ts
import { Inject, Injectable } from '@nexusts/core';
import { HealthCheckService, HealthIndicator } from '@nexusts/health';
import type { HealthIndicatorResult } from '@nexusts/health';

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator {
  readonly name = 'database';
  constructor(@Inject('DB') private db: Db) {}
  async check(): Promise<HealthIndicatorResult> {
    await this.db.ping();
    return { status: 'up' };
  }
}

// Register at boot:
const svc = app.container.resolve(HealthCheckService.TOKEN) as HealthCheckService;
svc.register(new DatabaseHealthIndicator(db));
```

---

## 2. `@nexusts/config` — configuration with Zod validation

Type-safe, schema-validated configuration loaded from env vars and
`.env` files. Throws (or `process.exit(1)`) on validation failure so
misconfigured deploys fail fast.

### Quick start

```ts
// app/config/schema.ts
import { z } from 'zod';
export const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// app/app.module.ts
import { Module } from '@nexusts/core';
import { ConfigModule } from '@nexusts/config';
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

### Usage in services

```ts
import { Inject, Injectable } from '@nexusts/core';
import { ConfigService } from '@nexusts/config';
import { configSchema } from '../config/schema.js';

@Injectable()
class DatabaseService {
  constructor(
    @Inject(ConfigService.TOKEN)
    private config: ConfigService<typeof configSchema>,
  ) {}

  connect() {
    return this.config.require('DATABASE_URL'); // throws if missing
  }

  start() {
    return this.config.get('PORT', { default: 3000 });
  }
}
```

The class is parameterized with `typeof configSchema`, so `config.get('DATABASE_URL')`
returns `string` (not `unknown`) without manual type annotations.

### Layered loading

Config values are resolved in this order (higher wins):

```
1. process.env                    ← runtime overrides (Docker/K8s/CI)
2. .env.{NODE_ENV}                ← environment-specific (e.g. .env.production)
3. .env.local                     ← local developer overrides (add to .gitignore)
4. .env                            ← shared defaults (committed to git)
5. load() static layers            ← lowest priority
```

### Environment-aware `.env` loading

By default, `ConfigModule.forRoot()` auto-loads environment-specific
files based on `NODE_ENV`:

| File | Purpose | Git ? |
|------|---------|-------|
| `.env` | Shared defaults (all environments) | ✅ committed |
| `.env.local` | Local overrides (your machine only) | ❌ `.gitignore` |
| `.env.development` | Dev-specific values | ✅ committed |
| `.env.production` | Production secrets | ✅ committed |
| `.env.testing` | Test-specific overrides | ✅ committed |

```ts
// Example .env.production
DATABASE_URL=postgres://user:pass@prod:5432/myapp
LOG_LEVEL=warn
```

```ts
// Example .env.development
DATABASE_URL=postgres://localhost:5432/myapp
LOG_LEVEL=debug
```

Disable auto-loading or customize the paths:

```ts
ConfigModule.forRoot({
  schema: configSchema,
  // Custom: explicit file list (no auto-detection)
  envFilePaths: ['.env.custom', '/etc/secrets/.env'],

  // Disable env file loading entirely
  envFile: false,

  // Override the detected NODE_ENV (default: process.env.NODE_ENV)
  nodeEnv: process.env.APP_ENV ?? 'development',

  // Fail fast on missing required values
  exitOnError: process.env.NODE_ENV === 'production',
});
```

---

## 3. `@nexusts/logger` — structured logging with Pino

Built-in Pino integration. Pretty-prints in dev, JSON in prod.
Request-scoped via `AsyncLocalStorage` so every log inside a request
auto-includes `requestId` / `userId`.

### Quick start

```ts
import { Module } from '@nexusts/core';
import { LoggerModule } from '@nexusts/logger';

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

### Usage in services

```ts
import { Inject, Injectable } from '@nexusts/core';
import { Logger } from '@nexusts/logger';

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

### Request-scoped context

```ts
import { logger } from '@nexusts/logger';

async function handle(request: Request) {
  await logger.with({ requestId: crypto.randomUUID() }, async () => {
    logger.info('processing'); // auto-tagged with requestId
    // ...
  });
}
```

### Child loggers

```ts
class OrderService {
  private logger: Logger;

  constructor(@Inject(Logger.TOKEN) base: Logger) {
    this.logger = base.child({ service: 'order' });
  }
}
```

### Transports

- **PinoTransport** (production default) — JSON output via `pino`.
- **PrettyTransport** (dev default) — colorized via `pino-pretty`.
- **NullTransport** — drops everything (for tests).

---

## 4. `@nexusts/static` — static file serving

Serve files from a directory with proper `Content-Type`, ETag,
`Cache-Control`, and range-request support. Path-traversal safe.

### Quick start

```ts
import { Module } from '@nexusts/core';
import { StaticModule } from '@nexusts/static';
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

### Manual mounting (optional)

For SPA fallback (serve `index.html` for any unmatched route), mount
the middleware yourself:

```ts
import { Inject, Injectable } from '@nexusts/core';
import { StaticService } from '@nexusts/static';
import { Hono } from 'hono';

@Injectable()
class WebServer {
  constructor(@Inject(StaticService.TOKEN) private static: StaticService) {}

  build(): Hono {
    const app = new Hono();
    app.use('/assets/*', this.static.middleware());
    app.get('*', (c) => c.html('<h1>SPA</h1>')); // SPA fallback
    return app;
  }
}
```

### Features

- **Path-traversal protection** — `..`, absolute paths, drive letters are rejected.
- **ETag** — `If-None-Match` returns 304 without re-reading the file.
- **Range requests** — `Range: bytes=0-1023` returns 206 Partial Content.
- **`index.html` fallback** — directory requests resolve to `index.html`.
- **MIME inference** — `.html`, `.css`, `.js`, `.json`, `.png`, `.woff2`, etc.

---

## 5. Combined usage

A typical v0.3 app module:

```ts
import { Module } from '@nexusts/core';
import { HealthModule } from '@nexusts/health';
import { ConfigModule } from '@nexusts/config';
import { LoggerModule } from '@nexusts/logger';
import { StaticModule } from '@nexusts/static';
import { AuthModule } from '@nexusts/auth';
import { SessionModule } from '@nexusts/session';
import { QueueModule } from '@nexusts/queue';
import { ScheduleModule } from '@nexusts/schedule';
import { EventsModule } from '@nexusts/events';
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

## 6. See also

- [`../design/queue.md`](../design/queue.md) — sibling design doc
- [`../design/session.md`](../design/session.md) — session module
- [`../analysis/nestjs-comparison.md`](../analysis/nestjs-comparison.md) — why these modules matter
- [`../analysis/adonisjs-comparison.md`](../analysis/adonisjs-comparison.md) — Tier 1 prioritization
- [Pino documentation](https://getpino.io/) — logger backend
- [Zod documentation](https://zod.dev/) — config schema validator
