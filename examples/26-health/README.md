# 26 · Health Check

Health, liveness, and readiness endpoints with `@nexusts/health`.

## What it shows

- `HealthModule.forRoot({ indicators: [...] })` for DI
- Built-in `/health`, `/health/live`, `/health/ready` endpoints
- Drizzle indicator for DB connection check
- Custom indicators (file, queue, etc.)

## How to run

```bash
cd examples/26-health
bun main.ts
```

```bash
# Aggregate health
curl http://localhost:3000/health
# Liveness (process up?)
curl http://localhost:3000/health/live
# Readiness (deps ready?)
curl http://localhost:3000/health/ready
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { HealthModule, HealthIndicator, HealthService } from "@nexusts/health";

@Injectable()
class MemoryIndicator extends HealthIndicator {
  readonly name = "memory";
  async check() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return {
      status: used < 512 ? ("up" as const) : ("down" as const),
      data: { heapMB: Math.round(used) },
    };
  }
}

@Injectable()
@Controller("/")
class RootController {
  @Get("/")
  home() { return { service: "demo" }; }
}

@Module({
  imports: [HealthModule.forRoot()],
  controllers: [RootController],
  providers: [MemoryIndicator],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## Built-in endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /health` | All indicators + their status |
| `GET /health/live` | Always 200 (process is up) |
| `GET /health/ready` | 200 if all indicators are "up", 503 if any are "down" |

## Response format

```json
{
  "status": "up",
  "results": [
    { "name": "memory", "result": { "status": "up", "data": { "heapMB": 42 } } }
  ],
  "durationMs": 0,
  "timestamp": "2026-06-22T..."
}
```

## Drizzle indicator

```ts
import { DrizzleHealthIndicator } from "@nexusts/health/indicators/drizzle";

@Injectable()
class DbIndicator extends DrizzleHealthIndicator { ... }
```
