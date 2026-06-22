import "reflect-metadata";
import { Application, Controller, Get, Module, Param } from "@nexusts/core";

/**
 * 01-basic-mvc — minimal NexusTS application with a single
 * Nest-style controller. Run with: bun main.ts
 */

@Controller("/")
class HelloController {
  @Get("/")
  index() {
    return "Hello from NexusTS!";
  }

  @Get("/json")
  json() {
    return { message: "Hello", framework: "NexusTS" };
  }

  @Get("/users/:id")
  user(@Param("id") id: string) {
    return { id: Number(id), name: `User #${id}` };
  }
}

@Module({ controllers: [HelloController] })
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);