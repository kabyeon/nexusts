import "reflect-metadata";
import { Application, Controller, Get, Module, Injectable, Inject } from "@kabyeon/nexusjs";

/**
 * 02-routing-styles — three ways to register routes in the same app.
 *
 *   GET /              (Nest)
 *   GET /adonis        (Adonis)
 *   GET /hello/:name   (Functional)
 */

// ─── Style 1: Nest-style class decorator ──────────────────────────
@Controller("/")
class NestStyle {
  @Get("/")
  root() {
    return { style: "nest", message: "Class decorators" };
  }
}

// ─── Style 2: Adonis-style: router.add(method, path, ctrl, methodName) ─
@Controller("/adonis")
class AdonisStyle {
  list() {
    return { style: "adonis", message: "router.add registers a controller action" };
  }
}

// ─── Style 3: Functional: a raw Hono handler ─────────────────────
// Useful for middleware, dynamic routes, or Hono-native code.

// ─── Wire everything in a Module so we can show DI in main.ts too ──
@Injectable()
class AppService {
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}

@Module({
  providers: [AppService],
  controllers: [NestStyle, AdonisStyle],
})
class AppModule {}

const app = new Application(AppModule);

// Style 1 — registered automatically because NestStyle is in the
// module's `controllers` array above. We call registerController()
// explicitly here only to demonstrate the manual API.
app.server.router.registerController(NestStyle);

// Style 2 — Adonis-style: router.add(method, path, controller, methodName).
// Since this example's AdonisStyle has no constructor dependencies, we
// instantiate it directly. In a real app with DI, use
// `app.server.container.resolve(AdonisStyle)` (the module-scoped
// container, not the root `app.container`).
const adonisInstance = new AdonisStyle();
app.server.router.add("GET", "/adonis", () => adonisInstance, "list");

// Style 3 — resolve the service from the module-scoped container
// (not the root `app.container`, which only sees the root module's
// providers). Module containers are accessible via
// `app.modules[0].container`, but for clarity we instantiate the
// trivial service directly here — it has no dependencies.
const svc = new AppService();
app.server.router.raw("GET", "/hello/:name", (c) => {
  const name = c.req.param("name") ?? "world";
  return c.json({ style: "functional", message: svc.greet(name) });
});

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);