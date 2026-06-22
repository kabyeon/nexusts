import "reflect-metadata";
import { Application, Module, Controller, Get, Inject, Injectable } from "@kabyeon/nexusjs";
import { MetricsService, MetricsModule } from "@kabyeon/nexusjs/metrics";

/**
 * 19-metrics — Prometheus / OpenMetrics output at /metrics.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/orders   (a few times)
 *        curl http://localhost:3000/metrics  (see the counters)
 */

@Injectable()
@Controller("/orders")
class OrderController {
  constructor(@Inject(MetricsService) private metrics: MetricsService) {}

  @Get("/")
  place() {
    this.metrics.counter({ name: "page_hits", help: "page hits" }).inc({ path: "/orders" });
    return { ok: true, ts: Date.now() };
  }
}

@Module({
  imports: [MetricsModule.forRoot()],
  controllers: [OrderController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);