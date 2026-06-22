# 13 · Shield

Security suite: CSRF tokens, HSTS, CSP, X-Frame-Options.

## What it shows

- `ShieldModule.forRoot({ csrf, hsts, csp })` for DI
- CSRF token validation on POST/PUT/DELETE
- Security headers auto-injected on every response

## How to run

```bash
cd examples/13-shield
bun main.ts
```

```bash
# Show security headers
curl -I http://localhost:3000/

# Try POST without CSRF token (should fail with 403)
curl -X POST http://localhost:3000/transfer -d 'amount=100'
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Post, Body, Injectable } from "@nexusts/core";
import { ShieldModule } from "@nexusts/shield";

@Injectable()
@Controller("/transfer")
class TransferController {
  @Post("/")
  transfer(@Body() body: { amount: number }) {
    return { ok: true, amount: body.amount };
  }
}

@Module({
  imports: [
    ShieldModule.forRoot({
      csrf: { enabled: true },
      hsts: { maxAge: 31_536_000 },
      csp: { defaultSrc: ["'self'"] },
    }),
  ],
  controllers: [TransferController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## What gets injected

| Header | Default |
|--------|---------|
| `Strict-Transport-Security` | `max-age=31536000` |
| `Content-Security-Policy` | `default-src 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

## CSRF in real apps

For form submissions, render a hidden CSRF token:

```ts
@Get("/form")
form(@Ctx() c) {
  return c.html(`<form method="POST" action="/transfer">
    <input name="csrf" value="${c.get('csrf')}">
    <input name="amount">
  </form>`);
}
```
