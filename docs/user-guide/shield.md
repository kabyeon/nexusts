# Security Middleware · `@nexusts/shield`

> 한국어 버전: [`shield.ko.md`](./shield.ko.md)

`@nexusts/shield` provides CSRF protection, security headers (HSTS,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy), and Content
Security Policy. Inspired by AdonisJS Shield.

---

## Installation

The shield module ships **inside** `@nexusts/core` — no extra install
is needed.

```ts
import { ShieldModule } from '@nexusts/shield';
```

---

## Quick start

```ts
import { Module } from '@nexusts/core';
import { ShieldModule } from '@nexusts/shield';

@Module({
  imports: [
    ShieldModule.forRoot({
      csrf: { enabled: true },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
      xFrameOptions: 'DENY',
      xContentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  ],
})
export class AppModule {}
```

The shield middleware applies globally to every response.

---

## CSRF Protection

Uses the **synchronizer token pattern**: a signed cookie is set on safe
requests (GET, HEAD, OPTIONS); mutating requests (POST, PUT, DELETE, PATCH)
must echo the token in a header or form field.

### Configuration

```ts
ShieldModule.forRoot({
  csrf: {
    enabled: true,
    cookie: {
      secure: true,           // HTTPS only
      sameSite: 'Strict',     // or 'Lax' / 'None'
    },
    secret: process.env.SHIELD_SECRET!,  // used to sign tokens
  },
});
```

### How it works

1. **Safe requests** — Shield sets a `nexus-csrf` cookie containing a
   random unsigned value.
2. **Mutating requests** — Shield compares the cookie value against:
   - `X-CSRF-Token` header (recommended for SPAs)
   - `_csrf` form field (for traditional forms)
3. Both the cookie and the header/form value must match. The header/form
   value is **signed** with the secret; the cookie is **unsigned**.

### CSRF in forms

```html
<form method="POST" action="/contact">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <button type="submit">Send</button>
</form>
```

In your controller, issue the token via `ShieldService`:

```ts
class ContactController {
  constructor(@Inject(ShieldService.TOKEN) private shield: ShieldService) {}

  @Get('/contact')
  contactPage(@Res() res: any) {
    const t = this.shield.issueToken(res.headers);
    return { csrfToken: t.token };
  }
}
```

### CSRF in SPAs

Read the token from a `<meta>` tag and include it in every mutating
request:

```html
<meta name="csrf-token" content="{{ csrfToken }}">
```

```ts
// Using fetch
const token = document.querySelector('meta[name="csrf-token"]').content;
fetch('/api/data', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

---

## Security headers

### HSTS (Strict-Transport-Security)

```ts
ShieldModule.forRoot({
  hsts: {
    maxAge: 31_536_000,                // 1 year
    includeSubDomains: true,
    preload: true,                     // Submit to browser preload lists
  },
});
```

### CSP (Content-Security-Policy)

```ts
ShieldModule.forRoot({
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdn.example.com'],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'api.example.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    reportOnly: false,      // true = report violations without blocking
  },
});
```

### Other headers

```ts
ShieldModule.forRoot({
  xFrameOptions: 'DENY',           // or 'SAMEORIGIN' / false
  xContentTypeOptions: true,       // sets 'nosniff'
  referrerPolicy: 'strict-origin-when-cross-origin',
});
```

| Header | Value | Guarded against |
| ------ | ----- | --------------- |
| `X-Frame-Options` | `DENY` / `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing |
| `Referrer-Policy` | configurable | Referrer leakage |

---

## CORS

The `cors` option automatically handles preflight (OPTIONS) and sets
`Access-Control-*` headers on every response. When used with CSRF
protection, OPTIONS preflight bypasses CSRF checks so the browser's
preflight request works normally.

### Basic config

```ts
ShieldModule.forRoot({
  cors: {
    origin: ['https://app.example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
```

### Origin options

```ts
// Allow all origins (default; incompatible with credentials)
cors: { origin: '*' }

// Single origin
cors: { origin: 'https://app.example.com' }

// Whitelist
cors: { origin: ['https://a.com', 'https://b.com'] }

// Custom function
cors: {
  origin: (requestOrigin) => requestOrigin.endsWith('.mycompany.com'),
}
```

### Full example

```ts
ShieldModule.forRoot({
  cors: {
    origin: 'https://app.example.com',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86_400,       // cache preflight for 24h
  },
  csrf: { enabled: true },
});
```

> **Note:** `origin: '*'` and `credentials: true` cannot be used
> together. Restrict `origin` to specific domains for credentials
> to work.

---

## Direct service access

```ts
import { Inject } from '@nexusts/core';
import { ShieldService } from '@nexusts/shield';

class FormController {
  constructor(@Inject(ShieldService.TOKEN) private shield: ShieldService) {}

  @Get('/contact')
  contactPage(@Res() res: any) {
    const t = this.shield.issueToken(res.headers);
    return { csrfToken: t.token, metaTag: t.html };
  }
}
```

---

## API Reference

### `ShieldModule.forRoot(config)`

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `cors` | `CorsConfig \| false` | `false` | CORS headers |
| `csrf` | `CsrfConfig \| false` | `{ enabled: true }` | CSRF protection |
| `hsts` | `HstsConfig \| false` | `false` | HSTS header |
| `csp` | `CspConfig \| false` | `false` | Content-Security-Policy |
| `xFrameOptions` | `'DENY' \| 'SAMEORIGIN' \| false` | `'SAMEORIGIN'` | X-Frame-Options |
| `xContentTypeOptions` | `boolean` | `true` | X-Content-Type-Options |
| `referrerPolicy` | `string \| undefined` | `undefined` | Referrer-Policy |
| `secret` | `string` | `NEXUS_SHIELD_SECRET` env | Token signing secret |

### `CorsConfig`

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `origin` | `string \| string[] \| function \| false` | `'*'` | Allowed origins |
| `methods` | `string[]` | `GET POST PUT PATCH DELETE HEAD OPTIONS` | Allowed HTTP methods |
| `allowedHeaders` | `string[]` | `undefined` | `Access-Control-Allow-Headers` |
| `exposedHeaders` | `string[]` | `undefined` | `Access-Control-Expose-Headers` |
| `credentials` | `boolean` | `false` | `Access-Control-Allow-Credentials` |
| `maxAge` | `number` | `undefined` | Preflight cache TTL (seconds) |

### `CsrfConfig`

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `enabled` | `boolean` | — | Enable CSRF |
| `cookieName` | `string` | `'nexus-csrf'` | Cookie name |
| `headerName` | `string` | `'x-csrf-token'` | Header name |
| `fieldName` | `string` | `'_csrf'` | Form field name |
| `protectGet` | `boolean` | `false` | CSRF on safe methods too |
| `cookie` | `object` | — | Cookie attributes |
| `ignoreMethods` | `string[]` | `['GET','HEAD','OPTIONS']` | Safe methods |

### `ShieldService`

| Method | Description |
| ------ | ----------- |
| `issueToken(headers)` | Issue a new CSRF token and set the cookie |
| `middleware()` | Get the Hono middleware |

---

## See also

- [`../design/shield.md`](../design/shield.md) — design document
- [`cross-cutting-features.md`](./cross-cutting-features.md) — overview of all cross-cutting modules
