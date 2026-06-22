import "reflect-metadata";
import { z } from "zod";
import { Application, Module, Controller, Get, Inject, Injectable } from "@kabyeon/nexusjs";
import { ConfigService, ConfigModule } from "@kabyeon/nexusjs/config";

/**
 * 17-config — type-safe env access with Zod validation.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/info
 */

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default("my-app"),
  DEBUG: z.coerce.boolean().default(false),
});

@Injectable()
@Controller("/")
class AppController {
  constructor(@Inject(ConfigService) private config: ConfigService) {}

  @Get("/info")
  info() {
    return {
      appName: this.config.get("APP_NAME"),
      debug: this.config.get("DEBUG"),
      port: this.config.get("PORT"),
    };
  }
}

@Module({
  imports: [ConfigModule.forRoot({ schema })],
  controllers: [AppController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);