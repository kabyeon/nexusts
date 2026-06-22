import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable, Inject, Ctx } from "@kabyeon/nexusjs";

/**
 * 27-request-scope — per-request provider instances.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/counter   (twice — requestId differs, hits=1 each)
 */

@Injectable({ scope: "request" })
class RequestContext {
  requestId = Math.random().toString(36).slice(2, 10);
  hits = 0;
}

@Injectable()
@Controller("/")
class AppController {
  constructor(@Inject(RequestContext) private ctx: RequestContext) {}

  @Get("/counter")
  counter() {
    this.ctx.hits += 1;
    return { requestId: this.ctx.requestId, hits: this.ctx.hits };
  }

  @Get("/info")
  info(@Ctx() c: any) {
    return {
      requestId: this.ctx.requestId,
      url: c.req.url,
      method: c.req.method,
    };
  }
}

@Module({
  controllers: [AppController],
  providers: [RequestContext],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);