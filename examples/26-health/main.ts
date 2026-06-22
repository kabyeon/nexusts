import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { HealthModule, HealthIndicator } from "@nexusts/health";

/**
 * 26-health — liveness + readiness endpoints with a custom indicator.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/health
 */

@Injectable()
class MemoryIndicator extends HealthIndicator {
  readonly name = "memory";
  async check() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    return {
      status: (used < 512 ? "up" : "down") as "up" | "down",
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
  imports: [
    HealthModule.forRoot(),
  ],
  controllers: [RootController],
  providers: [MemoryIndicator],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);