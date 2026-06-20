# Session · cookie / memory / Redis

> 한국어 버전: [`session.ko.md`](./session.ko.md)

NexusJS ships a session module under `nexus/session` that provides a
uniform `SessionStorage` interface with multiple backends:

- **cookie** — HMAC-signed, stateless, edge-friendly. The entire
  session record is encoded in a single cookie.
- **memory** — in-process, for tests and single-instance dev.
- **redis** — planned for v0.2 (interface defined).

The session module is **separate from `nexus/core`**, **separate
from `nexus/auth`** (better-auth manages its own sessions), but
**integrates with `nexus/auth`** via `AuthService.bindSession()`.

---

## 1. Quick start

```ts
// src/app/app.module.ts
import { Module } from 'nexus';
import { SessionModule } from 'nexus/session';

@Module({
  imports: [
    SessionModule.forRoot({
      backend: 'cookie',
      cookie: { secret: process.env.SESSION_SECRET! },
    }),
  ],
})
export class AppModule {}
```

```ts
// src/controllers/cart.controller.ts
import { Controller, Post, Body } from 'nexus';
import { SessionService, CurrentSession } from 'nexus/session';

@Controller('/cart')
export class CartController {
  @Post('/')
  async add(@Session() session, @Body() body: { item: string }) {
    const cart = (session?.data.cart ?? []) as string[];
    cart.push(body.item);
    return this.sessions.update(session.id, { dataPatch: { cart } });
  }
}
```

---

## 2. The `SessionRecord` shape

```ts
interface SessionRecord {
  id: string;                              // random opaque id
  userId: string | null;                    // null for anonymous
  data: Record<string, unknown>;            // free-form per-session data
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  absoluteExpiresAt?: Date;
  metadata?: { ipAddress?, userAgent?, ... };
}
```

`data` is where your app stores per-session state — flash messages,
guest cart contents, CSRF tokens, OAuth flow state, etc.

---

## 3. Storage backends

### Cookie (recommended for edge / Workers)

```ts
SessionModule.forRoot({
  backend: 'cookie',
  cookie: {
    secret: process.env.SESSION_SECRET!,     // 16+ chars
    cookieName: 'nexus.sess',                // default
    defaultTtlSeconds: 60 * 60 * 24 * 7,     // 7 days
    cookieOptions: {
      domain: '.example.com',                // for subdomains
      path: '/',
      httpOnly: true,
      secure: true,                           // production
      sameSite: 'lax',                        // 'lax' | 'strict' | 'none'
      partitioned: false,
    },
  },
});
```

Format: `<base64url(payload)>.<base64url(HMAC-SHA256)>`. Stateless —
no server-side state needed. Ideal for Workers / Vercel / Deno
Deploy where shared storage isn't available.

### Memory

```ts
SessionModule.forRoot({
  backend: 'memory',
  memory: {
    gcIntervalMs: 60_000,
    maxSessions: 100_000,
  },
});
```

LRU-evicting `Map`. Good for tests, `bunx nx dev`, single-instance
deployments. GC runs on `setInterval`.

### Redis (v0.2)

Planned. The interface is already defined; only the backend
implementation is missing.

---

## 4. Programmatic API

```ts
class MyService {
  constructor(@Inject(SessionService.TOKEN) private sessions: SessionService) {}

  async login(userId: string) {
    const s = await this.sessions.create({
      ttlSeconds: 60 * 60 * 24 * 30,
      metadata: { ipAddress: '...' },
    });
    (s as { userId: string }).userId = userId;
    return s;
  }

  async logout(sessionId: string) {
    return this.sessions.destroy(sessionId, 'logout');
  }

  async readSession(sessionId: string) {
    return this.sessions.read(sessionId);
  }

  async updateCart(sessionId: string, cart: string[]) {
    return this.sessions.update(sessionId, { dataPatch: { cart } });
  }
}
```

### Static helpers

You can encode/decode session cookies without instantiating the
service (useful in middleware):

```ts
import { SessionService } from 'nexus/session';

const cookie = SessionService.encodeCookie(record, secret);
const record = SessionService.decodeCookie(cookieValue, secret);
```

---

## 5. `@Session` decorator

```ts
@Get('/profile')
profile(@Session() session: SessionRecord) {
  return session.data;
}

@Get('/admin')
admin(@Session({ required: true, role: 'admin' }) s) {
  return s;
}
```

Options:

| Key | Default | Effect |
| --- | ------- | ------ |
| `required` | `false` | Throw 401 if no session is present |
| `assert` | none | Throw 403 if `assert(session)` returns false |
| `touch` | `false` | Refresh `lastSeenAt` on each access |

The decorator requires `authMiddleware` to have populated
`c.var.session` first (or you read it from the cookie directly via
`SessionService.decodeCookie(c.req.header('cookie'))`).

---

## 6. Cookie issuance

When the backend is `cookie`, the `SessionService` exposes helpers
to build a `Set-Cookie` header:

```ts
class AuthController {
  @Post('/login')
  async login(@Body() body: { userId: string }) {
    const s = await this.sessions.create({ data: { userId: body.userId } });
    (s as { userId: string }).userId = body.userId;
    const setCookie = this.sessions.buildSetCookie(s);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'set-cookie': setCookie ?? '' },
    });
  }

  @Post('/logout')
  async logout(@Session() session) {
    await this.sessions.destroy(session.id, 'logout');
    const clearCookie = this.sessions.buildClearCookie();
    return new Response(null, {
      status: 204,
      headers: { 'set-cookie': clearCookie ?? '' },
    });
  }
}
```

---

## 7. Session rotation (session-fixation defense)

After authentication, rotate the session id so the previous
(unauthenticated) id can't be reused:

```ts
@Post('/login')
async login(@Session() session, @Body() body) {
  const fresh = await this.sessions.rotate(session.id);
  (fresh as { userId: string }).userId = body.userId;
  return new Response(null, {
    status: 200,
    headers: { 'set-cookie': this.sessions.buildSetCookie(fresh) ?? '' },
  });
}
```

`rotate()` creates a new record with the same data / metadata and
destroys the old one. The old id becomes invalid.

---

## 8. Integration with `nexus/auth`

`AuthService.bindSession(service)` links a `SessionService` to the
auth flow. After binding, `AuthService.getSession()` consults the
session cookie first (to surface non-better-auth state like flash
messages), then falls back to better-auth.

```ts
const AppSessionModule = SessionModule.forRoot({
  backend: 'cookie',
  cookie: { secret: process.env.SESSION_SECRET! },
});

@Module({
  imports: [AppAuthModule, AppSessionModule],
})
class AppModule {}

// src/app/main.ts
const app = new Application(AppModule);
const auth = app.container.resolve(AuthService);
const sessions = app.container.resolve(SessionService);
auth.bindSession(sessions);
```

Why would you want this?

- **Single sign-on across modules** — flash messages set by one
  module are visible to another.
- **Pre-auth session state** — guest carts, OAuth flow state.
- **Edge deploys** — cookie sessions work on Workers without DB
  access; better-auth's DB-backed sessions do too.

Both systems coexist: better-auth manages user identity;
`SessionService` manages transient state. They share the cookie.

---

## 9. Events

```ts
sessions.on((event) => {
  switch (event.kind) {
    case 'session:created':    // { id, userId }
    case 'session:read':
    case 'session:updated':
    case 'session:destroyed':  // { id, userId, reason: 'logout' | 'expired' | 'admin' | 'unknown' }
    case 'session:expired':
    case 'session:rotated':    // { oldId, newId }
  }
});
```

Handy for analytics, security audits, or invalidating caches when a
session is destroyed.

---

## 10. Configuration

```ts
SessionModule.forRoot({
  backend: 'cookie',                       // 'cookie' | 'memory' | 'redis'
  defaults: {
    ttlSeconds: 60 * 60 * 24 * 7,         // 7 days
    absoluteTtlSeconds: 60 * 60 * 24 * 30, // 30-day hard cap
  },
  cookie: { /* ... */ },
  memory: { /* ... */ },
  redis:  { /* ... */ },
});
```

---

## 11. CLI: `nx make:session`

```bash
nx make:session Cart
nx make:session Flash
```

Generates `src/session/services/<name>.session.ts` — an `@Injectable`
skeleton with typed accessor methods.

---

## 12. Testing

```ts
const backend = new MemorySessionStorage();
const s = await backend.create({ data: { cart: [] } });
const r = await backend.read(s.id);
expect(r?.id).toBe(s.id);
```

For cookie round-trip:

```ts
const storage = new CookieSessionStorage({ secret: SECRET });
const record = { id: 's', userId: null, data: {}, createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60_000) };
const cookie = storage.encode(record);
expect(storage.decode(cookie)?.id).toBe('s');
expect(storage.decode('tampered')).toBeNull();
```

---

## 13. See also

- [`../design/session.md`](../design/session.md) — architecture
- [`./auth.md`](./auth.md) — better-auth integration
- [`./cli.md`](./cli.md) — `nx make:session` reference
- [`iron-session`](https://github.com/vvo/iron-session) — inspiration
