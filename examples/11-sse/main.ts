import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@kabyeon/nexusjs";
import { sse } from "@kabyeon/nexusjs/sse";

/**
 * 11-sse — Server-Sent Events with type-safe streaming.
 *
 *   GET /events/timeseries  → streams "tick" events every second.
 *
 *   Run: bun main.ts
 *   Try: curl -N http://localhost:3000/events/timeseries
 */

@Injectable()
@Controller("/events")
class EventController {
  @Get("/timeseries")
  timeseries(c: any) {
    return sse(c, async (stream) => {
      let n = 0;
      stream.send({ event: "tick", data: { n } });
      const id = setInterval(() => {
        n += 1;
        stream.send({ event: "tick", data: { n, ts: Date.now() } });
      }, 1000);
      stream.onAbort(() => clearInterval(id));
      await new Promise(() => {});
    });
  }
}

@Module({
  controllers: [EventController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);