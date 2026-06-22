import "reflect-metadata";
import { Application, Module, Controller, Get, Inject, Injectable } from "@kabyeon/nexusjs";
import { TracingModule, TracingService } from "@kabyeon/nexusjs/tracing";

/**
 * 20-tracing — distributed tracing with OpenTelemetry.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/work
 *   Watch the console for trace output.
 */

@Injectable()
class WorkService {
  constructor(@Inject(TracingService) private trace: TracingService) {}

  async run() {
    return this.trace.withSpan("do-work", async (span) => {
      span.setAttribute("feature", "demo");
      await new Promise((r) => setTimeout(r, 100));
      return { done: true };
    });
  }
}

@Injectable()
@Controller("/")
class AppController {
  constructor(@Inject(WorkService) private svc: WorkService) {}

  @Get("/work")
  async work() {
    return await this.svc.run();
  }
}

@Module({
  // `as any` to satisfy TS — forRoot returns a class with attached `middleware` helper.
  imports: [TracingModule.forRoot({ serviceName: "demo" }) as any],
  controllers: [AppController],
  providers: [WorkService],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);