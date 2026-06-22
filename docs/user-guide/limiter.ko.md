# Rate Limiting · `@nexusts/limiter`

> English version: [`limiter.md`](./limiter.md)

`@nexusts/limiter`는 세 가지 전략, 플러그 가능한 스토리지 백엔드,
데코레이터 기반 라우트별 설정을 제공하는 레이트 리미터입니다.

---

## 설치

리미터 모듈은 `@nexusts/core` **내부**에 포함되어 있습니다 — 추가 설치가
필요 없습니다. `./limiter` 진입점에서 임포트하세요:

```ts
import { LimiterModule } from '@nexusts/limiter';
```

---

## 빠른 시작

```ts
import { Module } from '@nexusts/core';
import { LimiterModule } from '@nexusts/limiter';

@Module({
  imports: [
    LimiterModule.forRoot({
      rules: [
        { path: '/api/*',  points: 100, duration: '1m' },
        { path: '/login',  points: 5,   duration: '1m', methods: ['POST'] },
      ],
    }),
  ],
})
export class AppModule {}
```

미들웨어는 일치하는 모든 라우트에 자동으로 적용됩니다. 거절된 요청은
표준 레이트 리밋 헤더와 함께 `429 Too Many Requests` 응답을 받습니다.

---

## 전략

세 가지 전략을 사용할 수 있습니다:

| 전략 | 동작 | 사용 사례 |
| ---- | ---- | --------- |
| `sliding-window` (기본) | 후행 시간 창의 요청 수 카운트 | 일반 목적 |
| `fixed-window` | 고정 간격으로 카운터 리셋 | 간단한 버스트 제어 |
| `token-bucket` | 토큰이 일정 속도로 충전 | API 키 레이트 리밋 |

```ts
LimiterModule.forRoot({
  rules: [
    {
      path: '/search',
      points: 10,
      duration: '1s',
      strategy: 'token-bucket',
    },
  ],
});
```

---

## 글로벌 규칙

`forRoot()`에 정의된 규칙은 순서대로 평가됩니다. 요청을 거절하는 첫 번째
일치 규칙이 우선합니다.

```ts
LimiterModule.forRoot({
  rules: [
    // 모든 API 라우트에 분당 100회
    { path: '/api/*',    points: 100, duration: '1m' },
    // 인증 엔드포인트는 더 엄격하게
    { path: '/auth/*',   points: 10,  duration: '1m' },
    // 메서드별 규칙
    { path: '/login',    points: 5,   duration: '1m', methods: ['POST'] },
  ],
});
```

### 규칙 옵션

| 옵션 | 타입 | 설명 |
| ---- | ---- | ---- |
| `path` | `string` | 글로브 패턴 (`*` = 한 세그먼트, `**` = 모든 깊이) |
| `methods` | `string[]` | 적용할 HTTP 메서드 (기본: 전체) |
| `points` | `number` | 윈도우당 최대 요청 수 |
| `duration` | `DurationLike` | 윈도우 크기, 예: `'1s'`, `'1m'`, `'1h'`, `'1d'` |
| `strategy` | `string` | `'fixed-window'`, `'sliding-window'`, `'token-bucket'` |
| `key` | `(c) => string` | 사용자 지정 키 파생 (기본: IP) |
| `reject` | `(c, result) => Response` | 사용자 지정 거절 응답 |
| `skip` | `(c) => boolean` | 조건부 규칙 건너뛰기 |

---

## 라우트별 데코레이터

컨트롤러 메서드에 `@RateLimit`을 사용하여 라우트별 제한을 설정하세요:

```ts
import { Controller, Post } from '@nexusts/core';
import { RateLimit } from '@nexusts/limiter';

@Controller('/auth')
class AuthController {
  @Post('/login')
  @RateLimit({
    points: 5,
    duration: '1m',
    key: (c) => c.req.header('x-api-key') ?? 'unknown',
  })
  login() {
    // API 키별 레이트 리밋 적용
  }
}
```

---

## 스토리지 백엔드

### 인메모리 (기본)

```ts
LimiterModule.forRoot({
  // 스토리지 설정 불필요; 인메모리가 기본값
  rules: [/*...*/],
});
```

단일 프로세스 전용. 클러스터 환경에서는 사용할 수 없습니다.

### Drizzle (데이터베이스)

멀티 프로세스 또는 영구 레이트 리밋 상태 저장용:

```ts
import { DrizzleService } from '@nexusts/drizzle';
import { DrizzleRateLimitStorage } from '@nexusts/limiter';

const db = new DrizzleService({
  dialect: 'postgres',
  connection: { url: process.env.DATABASE_URL! },
});
await db.open();

LimiterModule.forRoot({
  storage: new DrizzleRateLimitStorage(db, { tableName: 'rate_limits' }),
  rules: [/*...*/],
});
```

테이블 스키마:

```sql
CREATE TABLE rate_limits (
  key     TEXT PRIMARY KEY,
  strategy TEXT NOT NULL,
  max_points INTEGER NOT NULL,
  points  INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  log     JSONB
);
```

---

## 커스텀 스토리지

`RateLimitStorage` 인터페이스를 구현하세요:

```ts
import { RateLimitStorage, RateLimitResult } from '@nexusts/limiter';

class RedisRateLimitStorage implements RateLimitStorage {
  readonly kind = 'redis';

  async consume(key, points, limit, durationMs, strategy): Promise<RateLimitResult> {
    // 원자적 Lua 스크립트: INCR + EXPIRE
  }

  async reset(key): Promise<void> {
    // 키 상태 초기화
  }
}

LimiterModule.forRoot({
  storage: new RedisRateLimitStorage(redisClient),
  rules: [/*...*/],
});
```

---

## 응답 헤더

모든 레이트 리밋 응답에는 다음이 포함됩니다:

- `X-RateLimit-Limit` — 윈도우당 최대 포인트
- `X-RateLimit-Remaining` — 남은 포인트
- `X-RateLimit-Reset` — 윈도우 리셋 unix-seconds
- `Retry-After` — `429`일 때만

---

## 사용자 지정 거절

```ts
LimiterModule.forRoot({
  rules: [
    {
      path: '/api/*',
      points: 100,
      duration: '1m',
      reject: (c, result) =>
        c.json(
          { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
          429,
        ),
    },
  ],
});
```

---

## API 참조

### `LimiterModule.forRoot(config)`

| 파라미터 | 타입 | 기본값 | 설명 |
| -------- | ---- | ------ | ---- |
| `storage` | `RateLimitStorage` | `MemoryRateLimitStorage` | 백엔드 스토리지 |
| `rules` | `RateLimitRule[]` | `[]` | 글로벌 레이트 리밋 규칙 |
| `defaultKey` | `(c) => string` | IP 기반 | 기본 키 파생 함수 |
| `defaultReject` | `(c, result) => Response` | 429 JSON | 기본 거절 응답 |

### `LimiterService`

| 메서드 | 설명 |
| ------ | ---- |
| `check(key, rule)` | 키에 대한 단일 규칙 확인 |
| `reset(key)` | 키의 레이트 리밋 상태 초기화 |

### `@RateLimit(rule)`

메서드/클래스 데코레이터. 라우트별 레이트 리밋 규칙을 연결합니다.

---

## 참고

- [`../design/limiter.md`](../design/limiter.md) — 디자인 문서
- [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md) — 횡단 관심사 모듈 개요
