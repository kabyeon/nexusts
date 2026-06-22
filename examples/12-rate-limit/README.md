# 12 · Rate Limit

Protect endpoints from abuse with `@nexusts/limiter`.

## What it shows

- `LimiterModule.forRoot({ rules: [...] })` for DI
- Multiple strategies: `fixed`, `sliding`, `token-bucket`
- Path-based rules (e.g. `/api/*` = 100 reqs per minute)
- Per-key limits (IP, user ID, custom)

## How to run

```bash
cd examples/12-rate-limit
bun main.ts
```

Then:

```bash
# Hit a protected endpoint 5 times rapidly
for i in 1 2 3 4 5; do
  curl -s -w " [%{http_code}]\n" http://localhost:3000/api/data
done
```

You should see the 6th call return `429 Too Many Requests`.

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { LimiterModule } from "@nexusts/limiter";

@Injectable()
@Controller("/api")
class ApiController {
  @Get("/data")
  data() { return { items: [1, 2, 3] }; }
}

@Module({
  imports: [
    LimiterModule.forRoot({
      // 5 requests per 10 seconds for /api/*
      rules: [
        {
          path: "/api/*",
          points: 5,
          duration: 10_000,
          strategy: "sliding",
        },
      ],
      // Backend: "memory" (default) or "drizzle" for multi-pod
    }),
  ],
  controllers: [ApiController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## Strategies

| Strategy | Behavior |
|----------|----------|
| `fixed` | Resets every N seconds (simple) |
| `sliding` | Sliding window — fair rate over time |
| `token-bucket` | Allows bursts up to capacity, refills over time |

## Production backend

For multi-pod, use the Drizzle backend (saves counts in DB):

```ts
LimiterModule.forRoot({
  rules: [{ path: "/api/*", points: 100, duration: 60_000 }],
  storage: "drizzle",
})
```
