/**
 * NexusTS benchmark server.
 *
 * Endpoints:
 *   GET /hello       — plain-text hello world (routing overhead)
 *   GET /json        — JSON serialization
 *   GET /di          — DI service resolve + method call
 *   GET /middleware  — pass through 10 middleware layers
 *
 * Run: bun benchmarks/servers/nexusts.ts [port]
 */

import "reflect-metadata";
import {
  Application,
  Controller,
  Get,
  Injectable,
  Module,
} from "@nexusts/core";

// ── DI service ──────────────────────────────────────────────────────────────

@Injectable()
class GreetService {
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}

// ── Controller ───────────────────────────────────────────────────────────────

@Controller("/")
class BenchController {
  constructor(private readonly greet: GreetService) {}

  @Get("/hello")
  hello() {
    return "Hello from NexusTS!";
  }

  @Get("/json")
  json() {
    return {
      message: "ok",
      framework: "nexusts",
      timestamp: Date.now(),
    };
  }

  @Get("/di")
  di() {
    return { result: this.greet.greet("world") };
  }

  @Get("/middleware")
  middleware() {
    return { passed: 10 };
  }
}

// ── Middleware chain (10 layers) ──────────────────────────────────────────────

const noopMiddlewares = Array.from({ length: 10 }, () =>
  (_c: any, next: any) => next()
);

// ── Module ───────────────────────────────────────────────────────────────────

@Module({
  controllers: [BenchController],
  providers: [GreetService],
})
class BenchModule {}

// ── Bootstrap ────────────────────────────────────────────────────────────────

const port = Number(process.argv[2] ?? process.env.PORT ?? 3001);
const app = new Application(BenchModule, { middleware: noopMiddlewares });

await app.listen(port);
console.log(`[nexusts] listening on http://localhost:${port}`);
