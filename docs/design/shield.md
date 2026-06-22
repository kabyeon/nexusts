# Shield Module — design

> 한국어 버전: [`shield.ko.md`](./shield.ko.md)

This document explains the architecture of `@nexusts/shield`:
CSRF protection, security headers, how guards compose, and the
middleware pipeline.

## Goals

1. **Defense in depth.** CSRF tokens for mutating requests, HSTS for
   HTTPS enforcement, CSP for XSS mitigation, and standard headers for
   clickjacking/sniffing/referrer protection — all in one module.
2. **Synchronizer token pattern (not double-submit).** The CSRF token
   is signed with a secret key and verified against the cookie value.
   This is stronger than the double-submit-cookie pattern used by
   many frameworks.
3. **AdonisJS-shaped API.** Familiar config for developers coming from
   AdonisJS. The same guards with the same defaults.
4. **Zero overhead when disabled.** Each guard can be individually
   disabled (`false`). Disabled guards are tree-shakeable — they don't
   allocate or run.

## Architecture

```
                  ┌───────────────────────────────┐
                  │       ShieldMiddleware          │
                  │  (single Hono middleware)       │
                  │                                 │
                  │  ┌────────────┐  ┌───────────┐  │
                  │  │ CsrfGuard  │  │HeadersGuard│  │
                  │  │ (mutating) │  │ (all)      │  │
                  │  │  403 |     │  │  HSTS      │  │
                  │  │  skip      │  │  CSP       │  │
                  │  │            │  │  XFO       │  │
                  │  │            │  │  XCTO      │  │
                  │  │            │  │  RP        │  │
                  │  └────────────┘  └───────────┘  │
                  └──────────────────────────────────┘
```

### Guard composition

`ShieldService` constructs the guards at module init time. Each guard
is independently configurable and independently disabled. The
`middleware()` method on `ShieldService` returns a single Hono
middleware that runs both guards in sequence:

1. **CSRF check** — before the handler. Applies to mutating methods
   (POST, PUT, DELETE, PATCH). Rejects with `403` on failure.
2. **Security headers** — sets response headers. Runs on every request,
   including CSRF failures (so the error response itself is protected).

## CSRF protection

### Synchronizer token pattern

```
Safe request (GET):
  Server → Set-Cookie: nexus-csrf=<random unsigned value>; Secure; SameSite
  Client → (cookie sent automatically)

Mutating request (POST):
  Client → Cookie: nexus-csrf=<unsigned>
           Header: X-CSRF-Token=<signed version of the same value>
  Server → Verify: unsigned(cookie) === signed(header).unsigned
           If match → allow. If not → 403.
```

### Token lifecycle

1. **Issue:** `CsrfGuard.issue(res)` generates a random 24-byte
   base64url value, signs it with the encryption service, and sets
   the unsigned value as a cookie.
2. **Verify:** `CsrfGuard.verify(req)` extracts the cookie value,
   extracts the signed header value, verifies the signature, and
   compares the unsigned payloads using constant-time comparison
   (delegated to `EncryptionService.verifyRaw`).
3. **Token reuse:** The cookie value is valid for the lifetime of the
   cookie (a session). The signed value in the header can be issued
   once and reused until the cookie expires. This is safe because an
   attacker who steals the cookie alone cannot forge the signed header.

### Signature construction

```ts
function sign(raw: string, secret: string): string {
  const sig = new EncryptionService(secret).signRaw(raw, 'csrf');
  return `${raw}.${sig}`;
}
```

The `'csrf'` purpose tag prevents token reuse across domains (e.g.,
a CSRF token cannot authenticate a session token). See the crypto
module's design for the signing scheme.

### Cookie attributes

| Attribute | Default | Rationale |
|-----------|---------|-----------|
| `SameSite` | `Lax` | Safe for top-level navigations |
| `Secure` | `true` | HTTPS only in production |
| `HttpOnly` | `false` | Client-side JS reads the meta tag; cookie itself only needs to echo |
| `Path` | `/` | Valid for all routes |

Setting `HttpOnly: false` is intentional — the browser must send the
cookie on every request (including XHR/fetch), but the token value in
the header must be readable by JS. The cookie value itself is
unsigned and meaningless without the signature.

## Security headers

### HSTS (`Strict-Transport-Security`)

Forces browsers to use HTTPS for the domain. Configurable `maxAge`,
`includeSubDomains`, and `preload`. Default: `false` (opt-in, because
setting HSTS on a dev server is annoying).

### CSP (`Content-Security-Policy`)

Whitelist of allowed sources for scripts, styles, images, fonts, etc.
Configurable per directive. `reportOnly: true` sets the
`Content-Security-Policy-Report-Only` header instead, which reports
violations without blocking. Default: `false`.

Directive names accept both camelCase (`defaultSrc`) and kebab-case
(`default-src`). The framework normalizes to kebab-case internally.

### Other headers

| Header | Guard | Default | Effect |
|--------|-------|---------|--------|
| `X-Frame-Options` | Clickjacking | `SAMEORIGIN` | Prevent embedding in `<frame>`/`<iframe>` |
| `X-Content-Type-Options` | MIME sniffing | `true` (nosniff) | Force strict MIME checking |
| `Referrer-Policy` | Referrer leakage | `undefined` (opt-in) | Control `Referer` header |

## DI integration

```
ApplicationContainer
  └── ConfiguredShieldModule
        ├── ShieldService
        ├── ShieldService.TOKEN (Symbol alias)
        └── "SHIELD_CONFIG" (useValue: config)
```

`ShieldService` reads `SHIELD_CONFIG` at construction and instantiates
the guards. The service is exported via both its class token and a
Symbol token for compatibility with `@Inject()`.

## Future work

- **Rate-limit CSRF failures** — prevent brute-force token guessing.
- **Double-submit cookie mode** — for SPAs that can't access a signed
  token but can set a custom header.
- **CSRF exemption for webhooks** — allow specific paths to skip the
  CSRF check (e.g., Stripe webhook `/stripe/webhook`).
- **Reporting endpoints** — `report-uri` / `report-to` for CSP
  violations, integrated with the framework's event system.

## See also

- [`../user-guide/shield.md`](../user-guide/shield.md) — user guide
- [`crypto.md`](./crypto.md) — encryption service
- [`cross-cutting-features.md`](../user-guide/cross-cutting-features.md) — overview
