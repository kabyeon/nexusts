import "reflect-metadata";
import path from "node:path";
import { Application, Module, Controller, Get, Post, Body, Inject, Ctx, Injectable } from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import { Inertia, createReactAdapter } from "@nexusts/view";
import { HomePage } from "./frontend/home.tsx";

/**
 * 29-inertia-react-ssr — Inertia.js v3 with React **server-side rendered**.
 *
 *   The first-page HTML is fully rendered by `react-dom/server` and
 *   embedded in the page shell. The client React then **hydrates** the
 *   existing DOM instead of mounting from scratch.
 *
 *   Run: bun main.ts
 *   Open: http://localhost:3000
 *
 *   The server requires `react`, `react-dom` as peer-deps:
 *     bun add react react-dom
 *   The client is bundled from `frontend/client.tsx` (hydration entry)
 *   into `./public/app.js`:
 *     bun build ./frontend/client.tsx --outdir=./public \
 *       --target=browser --format=esm --minify
 *
 *   This matches the Laravel + Inertia (SSR) recipe.
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
      greeting: "Hello from Inertia + React SSR!",
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
        greeting: "Hello from Inertia + React SSR!",
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
  providers: [
    {
      provide: Inertia.TOKEN,
      useValue: new Inertia({
        ssr: createReactAdapter({ components: { Home: HomePage } }),
      }),
    },
  ],
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
