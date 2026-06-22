import "reflect-metadata";
import { Application, Controller, Get, Module, Param } from "@kabyeon/nexusjs";

/**
 * 01-basic-mvc — minimal NexusJS application with a single
 * Nest-style controller. Run with: bun main.ts
 */

@Controller("/")
class HelloController {
  @Get("/")
  index() {
    return "Hello from NexusJS!";
  }

  @Get("/json")
  json() {
    return { message: "Hello", framework: "NexusJS" };
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