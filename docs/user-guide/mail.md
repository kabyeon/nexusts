# Email · `@nexusts/mail`

> 한국어 버전: [`mail.ko.md`](./mail.ko.md)

`@nexusts/mail` provides outbound email delivery with pluggable
transports: SMTP (via nodemailer), file-based `.eml` output for
development, and a null transport for tests.

---

## Installation

The mail module ships **inside** `@nexusts/core` — no extra install
is needed for the file or null transports.

```ts
import { MailModule } from '@nexusts/mail';
```

Optional peer dependencies:

```
bun add nodemailer              # for SmtpTransport
bun add mjml                    # for renderMjml()
```

---

## Quick start

```ts
import { Module } from '@nexusts/core';
import { MailModule, NullTransport } from '@nexusts/mail';

@Module({
  imports: [
    MailModule.forRoot({
      transport: new NullTransport(),       // Drop all mail
      defaultFrom: 'no-reply@example.com',
    }),
  ],
})
export class AppModule {}
```

---

## Transports

### SMTP (production)

```ts
import { SmtpTransport } from '@nexusts/mail';

MailModule.forRoot({
  transport: new SmtpTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,                          // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    pool: true,                            // Connection pool
    maxConnections: 5,
  }),
  defaultFrom: 'no-reply@example.com',
});
```

### File transport (development)

Writes every outgoing message as a `.eml` file:

```ts
import { FileTransport } from '@nexusts/mail';

MailModule.forRoot({
  transport: new FileTransport({
    dir: './tmp/mail',                     // Output directory
    includeHeaders: true,                  // Full .eml with headers
  }),
});
```

Each file is named `<timestamp>-<random>.eml` and can be opened in
any mail client (Thunderbird, Outlook, Apple Mail) or read as plain
text.

### Null transport (tests)

Drops every message. Captures sent messages for inspection:

```ts
import { NullTransport } from '@nexusts/mail';

const transport = new NullTransport();

MailModule.forRoot({ transport });

// In tests:
const mailService = container.resolve(MailService);
await mailService.send({ to: 'test@example.com', subject: 'Hi', html: '...' });
console.log(transport.sent.length);  // -> 1
```

---

## Sending mail

```ts
@Injectable()
class AuthMailer {
  constructor(@Inject(MailService.TOKEN) private mail: MailService) {}

  async sendWelcome(to: string, name: string) {
    await this.mail.send({
      to,
      subject: 'Welcome!',
      html: `<h1>Hi ${name}!</h1><p>Thanks for joining.</p>`,
      text: `Hi ${name}! Thanks for joining.`,
      attachments: [
        { filename: 'logo.png', content: pngBuffer, cid: 'logo' },
      ],
    });
  }
}
```

### Batch send

```ts
await mail.sendBatch(
  { subject: 'Newsletter', html: '<h1>Monthly update</h1>' },
  ['alice@example.com', 'bob@example.com'],
);
```

Sends one envelope per recipient.

---

## MJML templates

Render responsive HTML email templates with MJML:

```ts
const html = await mail.renderMjml(`
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>Hello {{name}}</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`);
```

`mjml` is an optional peer dependency. Install it only if you need it:

```
bun add mjml
```

If not installed, `renderMjml()` throws a clear error with installation
instructions.

---

## Message format

```ts
interface MailMessage {
  from?: MailAddress;
  to: MailAddress | MailAddress[];
  cc?: MailAddress | MailAddress[];
  bcc?: MailAddress | MailAddress[];
  replyTo?: MailAddress;
  subject: string;
  text?: string;            // Plain text version
  html?: string;            // HTML version
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}
```

A `MailAddress` can be a string (`'user@example.com'`) or an object
with `name` and `address` (`{ name: 'Alice', address: 'alice@example.com' }`).

### Attachments

```ts
{
  filename: 'report.pdf',
  content: pdfBuffer,       // Buffer or string
  contentType: 'application/pdf',
  cid: 'attachment1',       // Content-ID (for inline images)
}
```

---

## Response headers

When `SmtpTransport` is configured, you can also forward custom headers
that will be passed to nodemailer's `sendMail()`:

```ts
mail.send({
  to: 'user@example.com',
  subject: 'Receipt',
  html: '<h1>Thank you</h1>',
  headers: {
    'X-Entity-Ref-ID': 'order-12345',
  },
});
```

---

## API Reference

### `MailModule.forRoot(config)`

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `transport` | `MailTransport` | `NullTransport` | Mail transport |
| `defaultFrom` | `MailAddress` | `undefined` | Default sender address |

### `MailService`

| Method | Description |
| ------ | ----------- |
| `send(msg)` | Send a single message |
| `sendBatch(msg, recipients)` | Send to multiple recipients |
| `renderMjml(template, vars?)` | Compile MJML to HTML |

### Transports

| Transport | Peer dep | Use case |
| --------- | -------- | -------- |
| `NullTransport` | None | Tests |
| `FileTransport` | None | Development |
| `SmtpTransport` | `nodemailer` | Production SMTP |

---

## See also

- [`../design/mail.md`](../design/mail.md) — design document
- [`cross-cutting-features.md`](./cross-cutting-features.md) — overview of all cross-cutting modules
