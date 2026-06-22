import "reflect-metadata";
import {
  Application, Controller, Get, Module, Param,
} from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import { setViewPaths } from "@nexusts/view";

/**
 * 06-rendu-views — server-rendered HTML with the Rendu template engine.
 *
 *   GET /           → renders views/home.html
 *   GET /users/:id  → renders views/user.html
 *   GET /static/*   → serves files from ./public
 *
 *   Run: bun main.ts
 *   Then: open http://localhost:3000/
 */

// Configure view paths before creating the app.
// (In a real app this comes from nx.config.ts's viewPaths setting.)
setViewPaths("./views");

@Controller("/")
class PageController {
  @Get("/")
  home() {
    return {
      view: "home.html",
      data: {
        title: "Welcome to NexusTS",
        items: ["Hono speed", "Drizzle ORM", "Type-safe DI"],
      },
    };
  }

  @Get("/users/:id")
  user(@Param("id") id: string) {
    return {
      view: "user.html",
      data: {
        id: Number(id),
        name: `User #${id}`,
        email: `user${id}@example.com`,
      },
    };
  }
}

// Static middleware: serve files from ./public at /static/*
// (This is a middleware, not a Module, so it goes in the app.use() chain.)
const staticMiddleware = StaticModule.mount({ root: "./public", prefix: "/static" });

@Module({
  controllers: [PageController],
})
class AppModule {}

const app = new Application(AppModule);
app.server.app.use("/static/*", staticMiddleware);

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);