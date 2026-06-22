import "reflect-metadata";
import { Application, Module, Controller, Get, Inject, Injectable } from "@kabyeon/nexusjs";
import { CacheService, CacheModule } from "@kabyeon/nexusjs/cache";

/**
 * 14-cache — get/set/invalidate pattern with the memory backend.
 *
 *   Run: bun main.ts
 *   Try: curl http://localhost:3000/slow (twice — second is from cache)
 */

@Injectable()
@Controller("/")
class PageController {
  constructor(@Inject(CacheService) private cache: CacheService) {}

  @Get("/slow")
  async slow() {
    const key = "homepage";
    const cached = await this.cache.get(key);
    if (cached) return { from: "cache", data: cached };

    await new Promise((r) => setTimeout(r, 1500));
    const data = { html: "<h1>Hello</h1>", ts: Date.now() };
    await this.cache.set(key, data, { ttl: 60_000, tags: ["homepage"] });
    return { from: "origin", data };
  }

  @Get("/bust")
  async bust() {
    await this.cache.invalidateByTag("homepage");
    return { ok: true };
  }
}

@Module({
  imports: [CacheModule.forRoot({})],
  controllers: [PageController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);