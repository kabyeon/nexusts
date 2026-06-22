import "reflect-metadata";
import path from "node:path";
import { Application, Module, Controller, Get, Post, Body, Inject, Ctx, Injectable } from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import { Inertia } from "@nexusts/view";

/**
 * 30-inertia-vue-spa — Inertia.js v2 with **Vue 3** (client-side only).
 *
 *   Run: bun main.ts
 *   Open: http://localhost:3000
 *
 *   The client is bundled from `frontend/app.js` (a single .js file —
 *   no JSX/TSX needed for Vue) and served at /static/app.js.
 *
 *   Build: bun build ./frontend/app.js --outdir=./public \
 *            --target=browser --format=esm --minify
 *
 *   This matches the Laravel + Inertia (CSR) recipe with Vue.
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
      greeting: "Hello from Inertia + Vue!",
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
        greeting: "Hello from Inertia + Vue!",
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
  providers: [{ provide: Inertia.TOKEN, useValue: new Inertia() }],
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
