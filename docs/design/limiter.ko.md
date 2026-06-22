# Rate Limiter 모듈 — 디자인

> English version: [`limiter.md`](./limiter.md)

이 문서는 `@nexusts/limiter`의 아키텍처를 설명한다: 세 가지
전략, 백엔드 스토리지 인터페이스, 글로벌 규칙과 데코레이터의 상호작용,
미들웨어 파이프라인.

## 목표

1. **플러그 가능한 전략.** fixed-window, sliding-window, token-bucket를
   기본 지원, 커스텀 전략을 위한 여지.
2. **플러그 가능한 스토리지.** 단일 프로세스용 기본 인메모리, 영속성용
   Drizzle, Redis/Workers KV 등 커스텀 백엔드.
3. **2단 규칙 적용.** 글로벌 규칙 (path/method 매칭)과 라우트별 데코레이터
   (`@RateLimit`). 둘 다 같은 `LimiterService.check()` 경로 사용.
4. **Zero 번들 영향.** 모듈은 별도 entry point. import하지 않는 사용자는
   비용 0.
5. **표준 rate-limit 헤더.** 모든 응답이 `X-RateLimit-Limit`,
   `X-RateLimit-Remaining`, `X-RateLimit-Reset`, 그리고 429일 때
   `Retry-After` 포함.

## 아키텍처

```
                  ┌───────────────────────────────┐
                  │       사용자 Controller         │
                  │  @RateLimit({ points: 5, ... }) │
                  └───────────┬───────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   ▼                   │
          │       LimiterMiddleware               │
          │   (글로벌 규칙을 순서대로 적용)      │
          │                   │                   │
          │         LimiterService.check(key,rule)│
          │                   ▼                   │
          │       RateLimitStorage.consume(...)   │
          │          ┌─────────────────┐          │
          │          │   MemoryStorage │          │
          │          │  DrizzleStorage │          │
          │          │  CustomStorage  │          │
          │          └─────────────────┘          │
          └───────────────────────────────────────┘
```

### 모듈 와이어링

`LimiterModule.forRoot(config)`가 반환하는 모듈 클래스:

- `LimiterService`가 `"LIMITER_CONFIG"` (사용자 config)에 바인딩
- `LimiterMiddleware`가 service 주입
- 둘 다 class token과 `Symbol.for(...)` token으로 export

미들웨어는 프레임워크의 mount 파이프라인에서 등록된 모든 Hono 라우트에
적용. controller 핸들러 **전에** 실행.

### 규칙 매칭 순서

1. 글로벌 규칙 (`forRoot()`)이 배열 순서대로 먼저 평가.
2. 라우트별 데코레이터 규칙이 선언 순서대로 그 다음 평가.
3. path + method 매치하고 **거부**하는 첫 규칙이 승리. 모든 규칙 통과
   시에만 `next()` 호출.

## 전략 구현

### Fixed-window

고정 간격으로 reset되는 단순 카운터. 낮은 메모리, 예측 가능한 reset
경계. window 경계에서의 burst 요청에 취약.

```ts
// 의사코드
if (bucket.resetAt <= now) {
  bucket = { resetAt: now + durationMs, count: 0 };
}
bucket.count += points;
allowed = bucket.count <= limit;
```

### Sliding-window (기본)

trailing window 내 요청 타임스탬프 로그 유지. fixed-window보다 정확 —
한 window 끝과 다음 window 시작의 burst가 유효 비율을 두 배로 만들 수 없음.

```ts
// 의사코드
log = log.filter(t => t > now - durationMs);
log.push(now);
allowed = log.length <= limit;
retryAfter = (log[0] + durationMs - now) / 1000;
```

### Token-bucket

안정적인 비율로 refill되는 토큰 버킷. 시간에 따른 burst smoothing에
최적 — 예: 클라이언트가 몇 분간 idle 후 1초에 많은 요청을 보내는 API key
rate limit.

```ts
// 의사코드
elapsed = now - bucket.updatedAt;
bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate);
bucket.updatedAt = now;
allowed = bucket.tokens >= points;
if (allowed) bucket.tokens -= points;
```

## 스토리지 백엔드

### In-memory (`MemoryRateLimitStorage`)

- 세 전략용 별도 `Map` 3개 (hot path에서 union 타입 복잡도 없음).
- 클러스터 안전성 없음. 각 프로세스는 자체 state 보유.
- Fixed-window 버킷: `{ resetAt, count }`
- Sliding-window 로그: `{ log: number[] }` — 타임스탬프
- Token bucket: `{ tokens, updatedAt }`

### Drizzle (`DrizzleRateLimitStorage`)

- sliding-window용 JSONB 로그 컬럼 단일 테이블.
- 원자적 `UPDATE ... WHERE` 동시성 가드.
- mixed-strategy 셋업이 동작하도록 키별로 strategy 저장.

두 백엔드 모두 `RateLimitStorage` 구현:

```ts
interface RateLimitStorage {
  consume(key, points, limit, durationMs, strategy): Promise<RateLimitResult>;
  reset(key): Promise<void>;
}
```

## 데코레이터 통합

`@RateLimit`는 `Symbol.for("nexus:RateLimitRule")` 키 아래 `Reflect.defineMetadata`로
메타데이터 저장. 클래스 레벨과 메서드 레벨 데코레이터 모두 생성자의
같은 메타데이터 키에 기록. 프레임워크가 DI 셋업 중에 이를 읽어 규칙을
글로벌 규칙 리스트에 머지, controller의 path prefix로 스코프.

```ts
@Controller('/auth')
@RateLimit({ points: 20, duration: '1m' })        // 클래스 레벨
class AuthController {
  @Post('/login')
  @RateLimit({ points: 5, duration: '1m' })         // 메서드 레벨
  login() {}
}
```

클래스 레벨 규칙은 controller의 모든 라우트에 적용. 메서드 레벨 규칙이
그 위에 레이어. 둘 다 평가; 더 엄격한 것 (먼저 거부)이 승리.

## Key 유도

기본값: `x-forwarded-for` 헤더 (첫 IP) → remote address → `'unknown'`.

규칙별 override:

```ts
@RateLimit({
  points: 100,
  duration: '1m',
  key: (c) => c.req.header('x-api-key') ?? 'anonymous',
})
```

또는 전역:

```ts
LimiterModule.forRoot({
  defaultKey: (c) => c.req.header('x-user-id'),
  rules: [...],
})
```

## 응답 포맷

기본 429 응답:

```json
{
  "error": "Too Many Requests",
  "limit": 100,
  "remaining": 0,
  "retryAfter": 45
}
```

매칭된 모든 요청에 설정되는 헤더 (429뿐 아니라):

- `X-RateLimit-Limit`: `number`
- `X-RateLimit-Remaining`: `number`
- `X-RateLimit-Reset`: `number` (unix 초)

## Future work

- **Redis 스토리지** — 세 전략 모두를 위한 원자적 Lua 스크립트.
- **글로벌 rate limit** — 라우트가 아닌 모든 경로에 걸친 per-IP 또는
  per-user.
- **Rate-limit 전파** — Redis pub/sub bus로 pod 간 state 공유 (warm
  standby, eventual consistency 아님).
- **Admin API** — 프로그래매틱하게 rate-limit state 검사·리셋
  (고객 지원에 유용).

## 참고

- [`../user-guide/limiter.ko.md`](../user-guide/limiter.ko.md) — 사용자 가이드
- [`../user-guide/cross-cutting-features.ko.md`](../user-guide/cross-cutting-features.ko.md) — 개요
