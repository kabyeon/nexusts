import "reflect-metadata";
import { Application, Module, Controller, Get, Inject, Injectable } from "@kabyeon/nexusjs";
import { Logger, LoggerModule } from "@kabyeon/nexusjs/logger";

/**
 * 18-logger — structured logging.
 *
 *   Run: bun main.ts
 *   Then: curl http://localhost:3000/log — watch the terminal output.
 */

@Injectable()
@Controller("/")
class AppController {
  constructor(@Inject(Logger.TOKEN) private logger: Logger) {}

  @Get("/log")
  log() {
    this.logger.info({ userId: 42 }, "user logged in");
    this.logger.warn({ key: "homepage" }, "cache miss");
    this.logger.error({ orderId: 99, reason: "card declined" }, "payment failed");
    return { ok: true };
  }
}

@Module({
  imports: [LoggerModule.forRoot({ level: "debug" })],
  controllers: [AppController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);