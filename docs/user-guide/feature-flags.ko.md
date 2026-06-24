# @nexusts/feature-flag — 피처 플래그

카나리 배포, A/B 테스팅, 점진적 롤아웃을 위한 first-party 피처 플래그 모듈.

```ts
import { FeatureFlagModule, FeatureFlagService, FeatureFlag } from '@nexusts/feature-flag';

@Module({
  imports: [
    FeatureFlagModule.forRoot({
      flags: {
        'new-dashboard': { enabled: true, rollout: 0.5 },
        'beta-api':      false,
      },
    }),
  ],
})
class AppModule {}
```

---

## 1. 설치

```bash
bun add @nexusts/feature-flag
```

외부 의존성 없음 — 기본 `memory` 백엔드는 in-process로 동작한다.

---

## 2. 모듈 등록

```ts
FeatureFlagModule.forRoot({
  flags: {
    // boolean 단축: true = { enabled: true }, false = { enabled: false }
    'maintenance-mode': false,

    // 풀 정의
    'new-checkout': {
      enabled: true,
      rollout: 0.2,                  // 20% 트래픽에만 활성화
      allowlist: ['internal-qa'],    // 항상 활성화할 ID 목록
      denylist:  ['banned-tenant'],  // 항상 비활성화할 ID 목록
    },
  },
})
```

---

## 3. FeatureFlagService API

```ts
@Controller('/api')
class ApiController {
  constructor(
    @Inject(FeatureFlagService.TOKEN) private flags: FeatureFlagService,
  ) {}

  @Get('/info')
  async info(c: Context) {
    const ctx = { userId: c.var.user?.id };
    const showBeta = await this.flags.isEnabled('new-checkout', ctx);
    return c.json({ beta: showBeta });
  }
}
```

| 메서드 | 설명 |
| ------ | ---- |
| `isEnabled(flag, context?)` | `Promise<boolean>` — 플래그가 활성화되어 있으면 `true` |
| `setFlag(name, definition)` | 런타임에 플래그 추가/수정 |
| `getFlag(name)` | 현재 정의 반환 (`undefined` if 미존재) |
| `applyDecorators(instance)` | `@FeatureFlag` 메타데이터를 인스턴스에 연결 |

---

## 4. @FeatureFlag 데코레이터

라우트 핸들러에 직접 게이트를 걸 수 있다:

```ts
@Controller('/dashboard')
class DashboardController {
  constructor(
    @Inject(FeatureFlagService.TOKEN) private flags: FeatureFlagService,
  ) {}

  @Get('/')
  @FeatureFlag('new-dashboard')          // 비활성 시 404 JSON 반환
  async index(c: Context) {
    return c.json({ page: 'new-dashboard' });
  }
}
```

모듈이 임포트된 후 컨테이너가 `applyDecorators(controller)` 를 자동으로 호출한다. 수동 호출도 가능:

```ts
this.flags.applyDecorators(myController);
```

### 옵션

```ts
@FeatureFlag('new-dashboard', {
  // Hono Context에서 FlagContext 추출
  contextFn: (c) => ({ userId: c.var.user?.id }),

  // 비활성 시 커스텀 응답
  onDisabled: (c) => c.json({ message: '준비 중입니다.' }, 503),
})
async index(c: Context) { ... }
```

---

## 5. 플래그 정의 규칙

| 규칙 | 우선순위 | 설명 |
| ---- | -------- | ---- |
| `denylist` | 1 (최고) | 목록에 있으면 무조건 비활성화 |
| `allowlist` | 2 | 목록에 있으면 무조건 활성화 |
| `enabled: false` | 3 | 플래그 자체를 끔 |
| `rollout` | 4 | 0-1 fractional — djb2 해시 기반 결정론적 버킷팅 |
| 기본값 | 5 (최저) | `enabled: true` 이면 활성화 |

`rollout`은 `context.userId → context.tenantId → context.key` 순으로 해시 시드를 선택한다.  
같은 userId는 항상 동일한 결과를 받는다 (sticky session).

---

## 6. 런타임 플래그 조작

```ts
// 배포 중 점진적 롤아웃 확대
flags.setFlag('new-checkout', { enabled: true, rollout: 0.8 });

// 긴급 비활성화
flags.setFlag('new-checkout', false);

// 현재 설정 확인
console.log(flags.getFlag('new-checkout'));
// → { enabled: false }
```

---

## 7. FlagContext 타입

```ts
interface FlagContext {
  userId?:     string;
  tenantId?:   string;
  key?:        string;  // userId/tenantId 없을 때 해시 시드
  attributes?: Record<string, unknown>;  // 커스텀 백엔드용
}
```

---

## 8. 커스텀 백엔드

`FeatureFlagBackend` 인터페이스를 구현해 LaunchDarkly / Unleash 등 외부 서비스와 연결할 수 있다:

```ts
import type { FeatureFlagBackend, FlagContext, FlagDefinition } from '@nexusts/feature-flag';

class LaunchDarklyBackend implements FeatureFlagBackend {
  constructor(private client: LDClient) {}

  async isEnabled(flagName: string, context?: FlagContext): Promise<boolean> {
    return this.client.variation(flagName, { key: context?.userId ?? 'anonymous' }, false);
  }

  setFlag() { /* no-op for remote backend */ }
  getFlag() { return undefined; }
}
```

현재 v0.8에서는 `memory` 백엔드만 first-party로 제공한다.  
LaunchDarkly / Unleash 어댑터는 v0.9 로드맵에 포함되어 있다.

---

## 9. 참고

- [`./cross-cutting-features.md`](./cross-cutting-features.md) — cache, shield, limiter 등 횡단 관심사
- [`../analysis/nestjs-comparison.ko.md`](../analysis/nestjs-comparison.ko.md) §5.2 — feature flag 격차 분석
- [LaunchDarkly Node.js SDK](https://docs.launchdarkly.com/sdk/server-side/node-js)
- [Unleash Node.js SDK](https://docs.getunleash.io/reference/sdks/node)
