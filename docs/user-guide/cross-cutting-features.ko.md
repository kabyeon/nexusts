# 횡단 관심사 · limiter, shield, cache, drive, mail

> English version: [`cross-cutting-features.md`](./cross-cutting-features.md)

> **이 문서는 이제 개요입니다.** 각 기능마다 전용 사용자 가이드와
> 디자인 문서가 있습니다. 아래 링크를 사용하세요.

v0.3에서 함께 출시되는 다섯 모듈 — `@nexusts/limiter`,
`@nexusts/shield`, `@nexusts/cache`, `@nexusts/drive`,
`@nexusts/mail` — production stack을 완성한다.
모두 독립 번들이고, 모두 같은 `Module.forRoot({...})` DI 패턴을 사용하며,
모두 peer dependency(Redis, AWS SDK, nodemailer 등)를 강제하지 않도록
설계되었다 (필요 없는 프로젝트는 가볍게 유지).

---

## 패키지별 가이드

| 모듈 | 사용자 가이드 | 디자인 문서 | 진입점 |
| ---- | ------------ | ---------- | ------ |
| Rate limiter | [`limiter.ko.md`](./limiter.ko.md) | [`../design/limiter.ko.md`](../design/limiter.ko.md) | `@nexusts/limiter` |
| 보안 (Shield) | [`shield.ko.md`](./shield.ko.md) | [`../design/shield.ko.md`](../design/shield.ko.md) | `@nexusts/shield` |
| 애플리케이션 캐시 | [`cache.ko.md`](./cache.ko.md) | [`../design/cache.ko.md`](../design/cache.ko.md) | `@nexusts/cache` |
| 파일 스토리지 (Drive) | [`drive.ko.md`](./drive.ko.md) | [`../design/drive.ko.md`](../design/drive.ko.md) | `@nexusts/drive` |
| 이메일 (Mail) | [`mail.ko.md`](./mail.ko.md) | [`../design/mail.ko.md`](../design/mail.ko.md) | `@nexusts/mail` |

---

## 공통 패턴

다섯 모듈 모두 동일한 규칙을 따릅니다:

### `Module.forRoot({...})` DI 패턴

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

### `TOKEN` Symbol을 통한 서비스 주입

모든 모듈은 DI 호환성을 위한 `TOKEN` Symbol을 내보냅니다:

```ts
constructor(
  @Inject(LimiterService.TOKEN) private limiter: LimiterService,
  @Inject(ShieldService.TOKEN) private shield: ShieldService,
  @Inject(CacheService.TOKEN) private cache: CacheService,
  @Inject(DriveService.TOKEN) private drive: DriveService,
  @Inject(MailService.TOKEN) private mail: MailService,
) {}
```

### 선택적 피어 의존성

| 모듈 | 선택적 피어 의존성 | 설치 시점 |
| ---- | ----------------- | -------- |
| `cache` | ioredis, @redis/client | 멀티 팟 캐시 필요 시 |
| `drive` | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | S3 / R2 사용 시 |
| `mail` | nodemailer, mjml | 실제 메일 발송 / MJML 사용 시 |

설치하지 않으면 해당 기능은 런타임에 명확한 에러 메시지를 던진다.
이렇게 하면 메모리/in-memory 변형만 필요한 프로젝트의 번들을 가볍게 유지.

---

## 종합 사용 예

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

## 참고

- [`./limiter.ko.md`](./limiter.ko.md) — rate limiting 사용자 가이드
- [`./shield.ko.md`](./shield.ko.md) — 보안 미들웨어 사용자 가이드
- [`./cache.ko.md`](./cache.ko.md) — 애플리케이션 캐시 사용자 가이드
- [`./drive.ko.md`](./drive.ko.md) — 파일 스토리지 사용자 가이드
- [`./mail.ko.md`](./mail.ko.md) — 이메일 사용자 가이드
- [`./production-basics.ko.md`](./production-basics.ko.md) — health / config / logger / static
- [`../design/architecture.ko.md`](../design/architecture.ko.md) — 전체 모듈 설계
