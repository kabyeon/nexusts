# Production Basics · health, config, logger, static

> 한국어 버전: [`production-basics.ko.md`](./production-basics.ko.md)

The four modules shipped in v0.3 — `nexus/health`, `nexus/config`,
`nexus/logger`, `nexus/static` — are the **production basics** that
every NestJS / AdonisJS backend takes for granted. They share the
same package boundary (separate entry point in the bundle) and the
same DI pattern (`Module.forRoot({...})`).

---

## 1. `nexus/health` — health checks

Liveness / readiness / startup endpoints for Kubernetes, load
balancers, and ops dashboards. Backed by a uniform `HealthIndicator`
interface.

### Quick start

```ts
// src/app/app.module.ts
import { Module } from 'nexus';
import { HealthModule } from 'nexus/health';

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
import { Inject, Injectable } from 'nexus';
import { HealthCheckService, HealthIndicator } from 'nexus/health';
import type { HealthIndicatorResult } from 'nexus/health';

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

## 2. `nexus/config` — configuration with Zod validation

Type-safe, schema-validated configuration loaded from env vars and
`.env` files. Throws (or `process.exit(1)`) on validation failure so
misconfigured deploys fail fast.

### Quick start

```ts
// src/config/schema.ts
import { z } from 'zod';
export const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// src/app/app.module.ts
import { Module } from 'nexus';
import { ConfigModule } from 'nexus/config';
import { configSchema } from './config/schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: configSchema,
      envFilePaths: ['.env.local', '.env'],
      exitOnError: process.env['NODE_ENV'] === 'production',
    }),
  ],
})
export class AppModule {}
```

### Usage in services

```ts
import { Inject, Injectable } from 'nexus';
import { ConfigService } from 'nexus/config';
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

```
process.env (base layer, wins on conflict)
   ↓
.env / .env.local (overrides env defaults)
   ↓
load() static layers (lowest priority)
   ↓
Zod schema validation
```

---

## 3. `nexus/logger` — structured logging with Pino

Built-in Pino integration. Pretty-prints in dev, JSON in prod.
Request-scoped via `AsyncLocalStorage` so every log inside a request
auto-includes `requestId` / `userId`.

### Quick start

```ts
import { Module } from 'nexus';
import { LoggerModule } from 'nexus/logger';

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
import { Inject, Injectable } from 'nexus';
import { Logger } from 'nexus/logger';

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
import { logger } from 'nexus/logger';

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

## 4. `nexus/static` — static file serving

Serve files from a directory with proper `Content-Type`, ETag,
`Cache-Control`, and range-request support. Path-traversal safe.

### Quick start

```ts
import { Module } from 'nexus';
import { StaticModule } from 'nexus/static';
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
import { Inject, Injectable } from 'nexus';
import { StaticService } from 'nexus/static';
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
import { Module } from 'nexus';
import { HealthModule } from 'nexus/health';
import { ConfigModule } from 'nexus/config';
import { LoggerModule } from 'nexus/logger';
import { StaticModule } from 'nexus/static';
import { AuthModule } from 'nexus/auth';
import { SessionModule } from 'nexus/session';
import { QueueModule } from 'nexus/queue';
import { ScheduleModule } from 'nexus/schedule';
import { EventsModule } from 'nexus/events';
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
