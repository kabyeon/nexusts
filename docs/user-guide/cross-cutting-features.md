# Cross-cutting features · limiter, shield, cache, drive, mail

> 한국어 버전: [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md)

> **This document is now an overview.** Each feature has its own
> dedicated user guide and design document. Use the links below.

The five modules shipped together in v0.3 — `@nexusts/limiter`,
`@nexusts/shield`, `@nexusts/cache`, `@nexusts/drive`,
`@nexusts/mail` — round out the production stack. They are all
independent bundles, all use the same `Module.forRoot({...})` DI pattern,
and all are designed to work without forcing peer dependencies (Redis,
AWS SDK, nodemailer, etc.) on projects that don't need them.

---

## Per-package guides

| Module | User guide | Design doc | Entry point |
| ------ | ---------- | ---------- | ----------- |
| Rate limiter | [`limiter.md`](./limiter.md) | [`../design/limiter.md`](../design/limiter.md) | `@nexusts/limiter` |
| Security (Shield) | [`shield.md`](./shield.md) | [`../design/shield.md`](../design/shield.md) | `@nexusts/shield` |
| Application cache | [`cache.md`](./cache.md) | [`../design/cache.md`](../design/cache.md) | `@nexusts/cache` |
| File storage (Drive) | [`drive.md`](./drive.md) | [`../design/drive.md`](../design/drive.md) | `@nexusts/drive` |
| Email (Mail) | [`mail.md`](./mail.md) | [`../design/mail.md`](../design/mail.md) | `@nexusts/mail` |

---

## Common patterns

All five modules follow the same conventions:

### `Module.forRoot({...})` DI pattern

```ts
@Module({
  imports: [
    LimiterModule.forRoot({ rules: [...] }),
    ShieldModule.forRoot({ csrf: { enabled: true } }),
    CacheModule.forRoot({ defaultTtl: 60 }),
    DriveModule.forRoot({ driver: new LocalDriver({ root: '/data' }) }),
    MailModule.forRoot({ transport: new SmtpTransport({...}) }),
  ],
})
export class AppModule {}
```

### Service injection via `TOKEN` Symbol

Every module exports a `TOKEN` Symbol for DI compatibility:

```ts
constructor(
  @Inject(LimiterService.TOKEN) private limiter: LimiterService,
  @Inject(ShieldService.TOKEN) private shield: ShieldService,
  @Inject(CacheService.TOKEN) private cache: CacheService,
  @Inject(DriveService.TOKEN) private drive: DriveService,
  @Inject(MailService.TOKEN) private mail: MailService,
) {}
```

### Optional peer dependencies

| Module | Optional peer dep | Install when… |
| ------ | ----------------- | ------------- |
| `cache` | ioredis, @redis/client | you need multi-pod cache |
| `drive` | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | you use S3 / R2 |
| `mail` | nodemailer, mjml | you actually send mail / use MJML |

If you don't install the dep, the corresponding feature throws a clear
error message at runtime. This keeps the bundle lean for projects that
only need the memory/in-memory variants.

---

## Combined usage

```ts
@Module({
  imports: [
    // basics
    ConfigModule.forRoot({ schema: configSchema, exitOnError: true }),
    LoggerModule.forRoot({ pretty: process.env.NODE_ENV !== 'production' }),
    HealthModule.forRoot({ builtIn: { memory: true, disk: { threshold: 0.1 } } }),

    // cross-cutting
    LimiterModule.forRoot({
      rules: [
        { path: '/api/*', points: 100, duration: '1m' },
        { path: '/auth/*', points: 10, duration: '1m' },
      ],
    }),
    ShieldModule.forRoot({
      csrf: { enabled: true },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
    }),
    CacheModule.forRoot({ defaultTtl: 60 }),
    DriveModule.forRoot({ driver: new LocalDriver({ root: '/var/data' }) }),
    MailModule.forRoot({
      transport: new SmtpTransport({ host: 'smtp.example.com' }),
      defaultFrom: 'no-reply@example.com',
    }),
  ],
})
export class AppModule {}
```

---

## See also

- [`./limiter.md`](./limiter.md) — rate limiting user guide
- [`./shield.md`](./shield.md) — security middleware user guide
- [`./cache.md`](./cache.md) — application cache user guide
- [`./drive.md`](./drive.md) — file storage user guide
- [`./mail.md`](./mail.md) — email user guide
- [`./production-basics.md`](./production-basics.md) — health / config / logger / static
- [`../design/architecture.md`](../design/architecture.md) — overall module design
