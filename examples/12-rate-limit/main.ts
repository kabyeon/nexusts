import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@kabyeon/nexusjs";
import { LimiterModule } from "@kabyeon/nexusjs/limiter";

/**
 * 12-rate-limit — protect endpoints from abuse.
 *
 *   Run: bun main.ts
 *   Try:
 *     for i in 1 2 3 4 5 6 7; do curl -s -w "[%{http_code}]\n" http://localhost:3000/api/data; done
 */

@Injectable()
@Controller("/api")
class ApiController {
  @Get("/data")
  data() { return { items: [1, 2, 3] }; }
}

@Module({
  imports: [
    LimiterModule.forRoot({
      rules: [
        { path: "/api/*", points: 5, duration: 10_000, strategy: "sliding-window" },
      ],
    }),
  ],
  controllers: [ApiController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);