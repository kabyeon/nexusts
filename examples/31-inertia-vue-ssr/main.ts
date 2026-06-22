import "reflect-metadata";
import path from "node:path";
import { Application, Module, Controller, Get, Post, Body, Inject, Ctx, Injectable } from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import { Inertia, createVueAdapter } from "@nexusts/view";
import { HomePage } from "./frontend/home.js";

/**
 * 31-inertia-vue-ssr — Inertia.js v2 with Vue 3 **server-side rendered**.
 *
 *   The first-page HTML is rendered by `@vue/server-renderer` and
 *   embedded in the page shell. The Vue client then **hydrates** the
 *   existing DOM.
 *
 *   Run: bun main.ts
 *   Open: http://localhost:3000
 *
 *   Build the hydration client from `frontend/client.js`:
 *     bun build ./frontend/client.js --outdir=./public \
 *       --target=browser --format=esm --minify
 *
 *   Peer-deps: `vue` (already required by the SPA variant) +
 *   `@vue/server-renderer` (SSR only).
 *
 *   This matches the Laravel + Inertia (SSR) recipe with Vue.
 */

let _count = 0;
const readCount = () => _count;
const bumpCount = () => { _count += 1; };

@Injectable()
@Controller("/")
class HomeController {
  constructor(@Inject(Inertia.TOKEN) private inertia: Inertia) {}

  @Get("/")
  home() {
    return this.inertia.render("Home", {
      greeting: "Hello from Inertia + Vue SSR!",
      count: readCount(),
    });
  }

  @Post("/counter")
  counter() {
    bumpCount();
    return this.inertia.location("/");
  }

  @Post("/greet")
  greet(@Ctx() c: any, @Body() body: { name?: string }) {
    if (!body?.name || body.name.trim().length === 0) {
      c.status(422);
      return this.inertia.render("Home", {
        greeting: "Hello from Inertia + Vue SSR!",
        count: readCount(),
        errors: { name: "Please tell us your name." },
      });
    }
    return this.inertia.render("Home", {
      greeting: `Welcome, ${body.name}!`,
      count: readCount(),
    });
  }
}

@Module({
  providers: [{
    provide: Inertia.TOKEN,
    useValue: new Inertia({
      ssr: createVueAdapter({ components: { Home: HomePage } }),
    }),
  }],
  controllers: [HomeController],
})
class AppModule {}

const app = new Application(AppModule);
app.server.app.use("/static/*", StaticModule.mount({
  root: path.join(import.meta.dir, "public"),
  prefix: "/static",
}));

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);
