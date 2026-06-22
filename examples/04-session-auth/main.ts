import "reflect-metadata";
import {
  Application, Controller, Get, Post, Body, Ctx, Module, Inject, Injectable,
} from "@kabyeon/nexusjs";
import {
  SessionService, SessionModule, sessionMiddleware, Session,
} from "@kabyeon/nexusjs/session";

/**
 * 04-session-auth — cookie-based session login.
 *
 *   POST /login     { "user": "alice" }     → sets sid cookie
 *   GET  /profile                           → reads session.user
 *   GET  /logout                            → clears sid cookie
 *
 *   Try:
 *     curl -i -X POST http://localhost:3000/login -d 'user=alice' -c /tmp/c.txt
 *     curl http://localhost:3000/profile -b /tmp/c.txt
 *     curl -i http://localhost:3000/logout -b /tmp/c.txt
 */

@Injectable()
@Controller("/")
class AuthController {
  constructor(
    @Inject(SessionService.TOKEN) private sessions: SessionService,
  ) {}

  @Post("/login")
  login(@Body() body: { user: string }, @Ctx() ctx: any) {
    if (!body.user || body.user.length === 0) {
      return ctx.text("Invalid", 400);
    }
    const sid = this.sessions.create({ data: { user: body.user } });
    return ctx.header("Set-Cookie", `sid=${sid}; HttpOnly; Path=/; Max-Age=86400`)
              .json({ ok: true, user: body.user });
  }

  @Get("/profile")
  profile(@Session() session: any) {
    return { user: session?.data?.user ?? null };
  }

  @Get("/logout")
  logout(@Ctx() ctx: any) {
    return ctx.header("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0")
              .json({ ok: true });
  }
}

@Module({
  imports: [
    SessionModule.forRoot({
      backend: "cookie",
      cookie: { secret: "x".repeat(64) },
    }),
  ],
  controllers: [AuthController],
})
class AppModule {}

const app = new Application(AppModule);

// Built-in session middleware — no custom code needed.
// It reads the `sid` cookie and populates `c.var.nexus.user`.
const sessions = app.container.resolve(SessionService.TOKEN) as SessionService;
app.server.app.use("*", sessionMiddleware(sessions));

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);