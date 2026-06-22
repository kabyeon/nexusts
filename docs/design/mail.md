# Mail Module — design

> 한국어 버전: [`mail.ko.md`](./mail.ko.md)

This document explains the architecture of `@nexusts/mail`:
the `MailTransport` interface, the three built-in transports, MJML
integration, and the zero-dependency design.

## Goals

1. **Pluggable transports.** SMTP for production, `.eml` files for
   development, null for tests — and any custom transport implementing
   `MailTransport`.
2. **Zero mandatory dependencies.** `NullTransport` and `FileTransport`
   have zero peer dependencies. `SmtpTransport` lazily loads
   `nodemailer`. `mjml` is also lazily loaded.
3. **Batch sending.** Send the same message to multiple recipients
   with a single call.
4. **MJML templates.** Render responsive HTML email templates with
   the optional `mjml` package.

## Architecture

```
User code (MailService)
  │
  ├── send(msg)              ──►  transport.send(msg)
  ├── sendBatch(msg, to[])   ──►  transport.send(msg) × n
  └── renderMjml(tpl)        ──►  mjml.mjml2html(tpl)

                  │
                  ▼
              MailTransport
          ┌──────────────────────┐
          │ SmtpTransport        │  ← nodemailer (lazy)
          │ FileTransport        │  ← .eml output
          │ NullTransport        │  ← drops + captures
          │ CustomTransport      │  ← implement MailTransport
          └──────────────────────┘
```

## The `MailTransport` interface

```ts
interface MailTransport {
  readonly kind: string;
  send(msg: MailMessage): Promise<MailSendResult>;
  close?(): Promise<void>;
}
```

Minimal by design. Three methods total (`send` + optional `close`),
one input type (`MailMessage`), one result type (`MailSendResult`).

## Message format

```ts
interface MailMessage {
  from?: MailAddress;
  to: MailAddress | MailAddress[];
  cc?: MailAddress | MailAddress[];
  bcc?: MailAddress | MailAddress[];
  replyTo?: MailAddress;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}
```

Both `text` and `html` versions are supported. Modern mail clients
display the HTML version; the text version is for legacy clients
and accessibility.

## Transport comparison

| Feature | SmtpTransport | FileTransport | NullTransport |
|---------|---------------|---------------|---------------|
| Delivery | SMTP server | `.eml` files | In-memory capture |
| Peer dep | nodemailer | None | None |
| Use case | Production | Development | Tests |
| Message capture | No (transient) | File system | `transport.sent[]` |
| Connection pool | Configurable | N/A | N/A |
| Attachments | Full support | Inline in .eml | Captured in memory |

### SmtpTransport

- Uses nodemailer's `createTransport()` with SMTP (or any nodemailer-
  supported transport like SendGrid, Mailgun, SES via extras).
- Connection pooling via `pool: true` / `maxConnections`.
- Lazy-loads nodemailer — import and transport creation happen on
  the first `send()` call.
- Accepts `extras` for nodemailer options not covered by the typed
  interface.

### FileTransport

- Writes `.eml` files to a configurable directory.
- Each file contains RFC 5322 headers (From, To, Subject, Date) plus
  the body.
- File names are `<timestamp>-<random>.eml` for uniqueness.
- Useful for visual regression tests and preview in development.

### NullTransport

- Drops every message — zero I/O.
- Captures sent messages in `transport.sent[]` for test assertions.
- Default transport when no config is provided.

## MJML integration

`mail.renderMjml()` dynamically imports `mjml`:

```ts
async renderMjml(template: string): Promise<string> {
  try {
    const mod = await import('mjml');
    const { html } = mod.mjml2html(template);
    return html;
  } catch {
    throw new Error(
      "renderMjml requires the 'mjml' package. Install it with: bun add mjml"
    );
  }
}
```

The import is wrapped in try/catch that produces a human-readable
error. MJML itself is loaded once and cached.

## Address format

```ts
type MailAddress = string | { name?: string; address: string };
```

The `SmtpTransport` and `FileTransport` both normalize addresses to
the `"Name <addr>"` format for SMTP headers. `NullTransport` keeps
them as-is.

## Future work

- **Template engine integration** — resolve Handlebars/Mustache/Vento
  templates from the view engine before sending.
- **Email queue** — defer sending via the `nexusts/queue` module for
  reliability and rate limiting.
- **Open/track** — transparent pixel + click tracking (opt-in).
- **Mailgun / SES / SendGrid transports** — thin adapters wrapping
  those APIs directly (without nodemailer).
- **Attachment streaming** — accept `ReadableStream` for large
  attachments.

## See also

- [`../user-guide/mail.md`](../user-guide/mail.md) — user guide
- [`../user-guide/queue.md`](../user-guide/queue.md) — queue module (for deferred mail)
- [`../user-guide/view-engines.md`](../user-guide/view-engines.md) — template rendering
