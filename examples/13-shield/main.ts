import "reflect-metadata";
import { Application, Module, Controller, Post, Body, Injectable } from "@kabyeon/nexusjs";
import { ShieldModule } from "@kabyeon/nexusjs/shield";

/**
 * 13-shield — security headers + CSRF protection.
 *
 *   Run: bun main.ts
 *   Try: curl -I http://localhost:3000/
 */

@Injectable()
@Controller("/transfer")
class TransferController {
  @Post("/")
  transfer(@Body() body: { amount: number }) {
    return { ok: true, amount: body.amount };
  }
}

@Module({
  imports: [
    ShieldModule.forRoot({
      csrf: { enabled: true },
      hsts: { maxAge: 31_536_000 },
      csp: { directives: { defaultSrc: ["'self'"] } },
    }),
  ],
  controllers: [TransferController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);