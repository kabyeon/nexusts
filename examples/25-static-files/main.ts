import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import path from "node:path";

/**
 * 25-static-files — serve files from ./public at /static/*.
 *
 *   Run: bun main.ts
 *   Try: curl -I http://localhost:3000/static/style.css
 */

@Injectable()
@Controller("/")
class HomeController {
  @Get("/")
  home() {
    return {
      message: "Static files served at /static/*",
      assets: ["/static/style.css", "/static/app.js"],
    };
  }
}

@Module({
  controllers: [HomeController],
})
class AppModule {}

const app = new Application(AppModule);

// Serve files from ./public at the /static/* URL prefix
const staticMiddleware = StaticModule.mount({
  root: path.join(import.meta.dir, "public"),
  prefix: "/static",
});
app.server.app.use("/static/*", staticMiddleware);

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);