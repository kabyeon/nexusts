# 04 · Session Auth

Cookie-based session login using `@nexusts/session`. No
better-auth, no third-party — just a session ID in a signed cookie.

## What it shows

- `SessionModule.forRoot({ backend: 'cookie' })` for DI
- The built-in `sessionMiddleware()` (no custom middleware needed)
- `@Session()` decorator to inject the current session
- HMAC-signed cookies via `SessionService.create()` / `destroy()`

## How to run

```bash
cd examples/04-session-auth
bun main.ts
```

Then:

```bash
# Login — get a `sid` cookie
curl -i -X POST http://localhost:3000/login -d 'user=alice' -c cookies.txt

# Read profile with the cookie
curl http://localhost:3000/profile -b cookies.txt

# Logout
curl -i http://localhost:3000/logout -b cookies.txt
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Controller, Get, Post, Session, Body, Module, Inject } from "@nexusts/core";
import { SessionModule, SessionService, sessionMiddleware } from "@nexusts/session";

@Injectable()
class AuthService {
  // In real apps, look up the user in a DB.
  // For this example, accept any non-empty user name.
  validate(name: string) { return name.length > 0; }
}

@Controller("/")
class AuthController {
  constructor(
    @Inject(SessionService.TOKEN) private sessions: SessionService,
  ) {}

  @Post("/login")
  login(@Body() body: { user: string }, @Ctx() ctx: any) {
    if (body.user.length === 0) return ctx.text("Invalid", 400);
    const sid = this.sessions.create({ data: { user: body.user } });
    return ctx.header("Set-Cookie", `sid=${sid}; HttpOnly; Path=/`)
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
  imports: [SessionModule.forRoot({ backend: "cookie", cookie: { secret: "x".repeat(64) } })],
  controllers: [AuthController],
})
class AppModule {}

const app = new Application(AppModule);

// Built-in middleware — no custom code needed.
const svc = app.container.resolve(SessionService.TOKEN);
app.server.app.use("*", sessionMiddleware(svc as SessionService));

await app.listen(3000);
```

## How it works

1. `sessionMiddleware` reads the `sid` cookie, decodes it (HMAC-verified), and sets `c.var.nexus.user`
2. `@Session()` reads from `c.var.nexus.user` and gives you the session record
3. The `data` field is your custom payload (here: `{ user: 'alice' }`)
4. The framework's `Application` automatically reads `viewPaths` from `nx.config.ts` (no need to call `setViewPaths` manually)

## Cookie tampering

If the user modifies the `sid` cookie value, `SessionService.decodeCookie`
returns `null` and the `@Session()` decorator returns `undefined`. The
HMAC is verified with the secret in `SessionModule.forRoot({ cookie: { secret } })`.
