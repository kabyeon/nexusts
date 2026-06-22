# 08 · Scheduler

Cron-style scheduled tasks using `@nexusts/schedule`.

## What it shows

- `@Cron(expression)` decorator for class methods
- `@Interval(ms)` and `@Timeout(ms)` decorators
- Built-in cron parser — no external dep
- `ScheduleService.start()` to begin the tick loop

## How to run

```bash
cd examples/08-scheduler
bun main.ts
```

Watch the console:

```
[tick] every 5s  — schedule.tick
[every-minute] minute boundary reached
[cron] daily 09:00 — dailyJob
[timeout] one-shot done after 3s
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Module, Injectable, Controller, Get } from "@nexusts/core";
import { Cron, Interval, Timeout, ScheduleService } from "@nexusts/schedule";

@Injectable()
class Tasks {
  @Interval(5000)
  every5Seconds() {
    console.log("[tick] every 5s — schedule.tick");
  }

  @Cron("* * * * *")                  // every minute
  everyMinute() {
    console.log("[every-minute] minute boundary reached");
  }

  @Cron("0 9 * * *")                  // daily at 09:00
  dailyJob() {
    console.log("[cron] daily 09:00 — dailyJob");
  }

  @Timeout(3000)                       // one-shot after 3s
  oneShot() {
    console.log("[timeout] one-shot done after 3s");
  }
}

@Controller("/")
class HealthController {
  @Get("/")
  status() { return { ok: true }; }
}

@Module({
  imports: [ScheduleService.forRoot()],
  controllers: [HealthController],
  providers: [Tasks],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);

// Boot the scheduler tick loop.
app.container.resolve(ScheduleService).start();
```

## Cron format

Standard 5-field (minute hour day-of-month month day-of-week):

```
*  *  *  *  *
│  │  │  │  └─ day of week (0–7, 0 and 7 = Sunday)
│  │  │  └─── month (1–12)
│  │  └────── day of month (1–31)
│  └───────── hour (0–23)
└──────────── minute (0–59)
```

## `@Interval` vs `@Cron`

| Decorator | Schedule |
|-----------|----------|
| `@Interval(ms)` | every N milliseconds |
| `@Timeout(ms)` | once, after N ms |
| `@Cron(expr)` | standard cron expression |

## Stop the loop

```ts
const schedule = app.container.resolve(ScheduleService);
schedule.stop();
```
