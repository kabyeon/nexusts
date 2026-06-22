import "reflect-metadata";
import { Application, Module, Injectable, Controller, Get } from "@kabyeon/nexusjs";
import { Cron, Interval, Timeout, ScheduleService, ScheduleModule } from "@kabyeon/nexusjs/schedule";

/**
 * 08-scheduler — cron-style scheduled tasks.
 *
 *   Run: bun main.ts
 *   Watch the console for tick output.
 */

@Injectable()
class Tasks {
  @Interval(5000)
  every5Seconds() {
    console.log("[tick] every 5s — schedule.tick");
  }

  @Cron("* * * * *")
  everyMinute() {
    console.log("[every-minute] minute boundary reached");
  }

  @Cron("0 9 * * *")
  dailyJob() {
    console.log("[cron] daily 09:00 — dailyJob");
  }

  @Timeout(3000)
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
  imports: [ScheduleModule.forRoot()],
  controllers: [HealthController],
  providers: [Tasks],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);

// Boot the scheduler tick loop after the HTTP server is ready.
app.container.resolve(ScheduleService).start();