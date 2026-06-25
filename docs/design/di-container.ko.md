# DI 컨테이너 설계

> 최종 업데이트: v0.1
> English version: [`di-container.md`](./di-container.md)

## 1. 목적

DI 컨테이너는 NexusTS의 핵심입니다. 다음을 담당합니다.

- 프로바이더 등록 (클래스, 값, 팩토리, 별칭)
- `reflect-metadata` 또는 내부 Map을 통한 의존성 재귀 해석 (듀얼모드)
- 인스턴스 라이프사이클 관리 (기본값: singleton)
- 의미 있는 에러로 순환 의존성 감지
- 모듈 단위 프로바이더 스코핑 (모듈은 캡슐화 단위)

구현 위치는 [`src/core/di/container.ts`](../../src/core/di/container.ts)와
[`src/core/di/scanner.ts`](../../src/core/di/scanner.ts)입니다.

---

## 2. 핵심 타입

```ts
// src/core/di/tokens.ts
type InjectionToken<T = any> = Type<T> | string | symbol;

interface Provider<T = any> {
  provide: InjectionToken<T>;
  useClass?: Type<T>;
  useValue?: T;
  useFactory?: (...args: any[]) => T;
  useExisting?: InjectionToken<T>;
  scope?: ProviderScope;        // 'singleton' | 'transient'
}

type ModuleOptions = {
  imports?: Type[];
  controllers?: Type[];
  providers?: Provider[];
  exports?: InjectionToken[];
};
```

프로바이더는 다음 어느 형태든 가능합니다.

| 형태 | 의미 |
| ---- | ------- |
| `Type<T>` (클래스) | `{ provide: Type, useClass: Type }`으로 취급 |
| `{ useClass }` | 컨테이너가 `useClass`를 인스턴스화 |
| `{ useValue }` | 컨테이너가 값을 그대로 보관 |
| `{ useFactory, deps? }` | 컨테이너가 해석된 의존성으로 팩토리 호출 |
| `{ useExisting }` | 같은 컨테이너의 다른 토큰에 대한 별칭 |

---

## 3. 컨테이너 계층

프레임워크는 **컨테이너 트리**를 구성합니다 — 모듈당 하나씩. 각 자식 컨테이너는 `parent` 참조를 가지며, 해석되지 않은 토큰은 부모로 폴백합니다.

```
ApplicationContainer   ← 전역 프로바이더 (Inertia, env, ...)
 ├── UserModule.container
 │     ├── UserController
 │     ├── UserService
 │     └── UserRepository
 ├── OrderModule.container
 │     ├── OrderController
 │     └── OrderService
 └── AuthModule.container  ← export된 토큰은 ApplicationContainer에 노출됨
       └── AuthService
```

왜 계층 구조인가?

- **캡슐화** — `UserModule`에 선언된 서비스는 `UserModule`이 다시 export하지 않는 한 `OrderModule`에서 주입할 수 없습니다.
- **감사 가능성** — 의존성 그래프가 트리이므로 렌더링이 쉽습니다.
- **테스트 가능성** — 자식 컨테이너를 mock으로 만들어 단위 테스트가 가능합니다.

---

## 4. 모듈 스캐닝

`ModuleScanner.scan(rootModule)`은 `@Module({...})` 그래프를 순회하면서:

1. `imports`를 깊이 우선으로 재귀하며, 각 모듈에 대해 자식 컨테이너를 만듭니다.
2. 각 모듈의 `controllers`와 `providers`를 읽어 모듈의 자식 컨테이너에 등록합니다.
3. 각 `exports` 항목에 대해 importing 부모 컨테이너에서 passthrough 팩토리를 만들어 import하는 모듈이 토큰을 해석할 수 있게 합니다.

스캐너는 이미 방문한 모듈을 `Map`에 메모이즈하여 두 모듈이 서로를 import하는 경우의 사이클을 끊습니다.

> **사이클 보호.** 스캐너는 imports로 재귀하기 전에 placeholder를 미리 채워 둡니다. 두 모듈이 서로를 import하면, 두 번째 방문에서 무한 재귀 대신 placeholder를 발견합니다.

---

## 5. 해석 알고리즘

```
resolve(token):
  if 현재 해석 중(token):
    throw CircularDependencyError
  표시(token, resolving)
  try:
    record = find_provider(token)        // self, 그 다음 parent 체인
    if not record: throw NoProviderError
    if record.scope === 'singleton' and cached: return cached
    instance = instantiate(record)
    singleton이면 cache
    return instance
  finally:
    표시 해제(token, resolving)
```

`find_provider`는 컨테이너 체인을 self → parent → … → `ApplicationContainer`(루트) 순서로 탐색합니다. 이것이 모듈 간 주입이 동작하는 방식입니다 — export된 토큰은 부모에 살고, 자식은 체인을 통해 요청합니다.

### 필드 인젝션 (표준 데코레이터 모드, v0.9+)

표준 데코레이터 모드(TC39)에서는 컨테이너가 필드 인젝션을 기본 패턴으로 지원합니다:

```ts
@Injectable()
class UserService {
  @Inject('DB') declare db: DrizzleService;
  @Inject(Logger) declare logger: Logger;
}
```

컨테이너의 `instantiate()` 메서드는 먼저 필드 인젝션을 확인합니다:

```ts
const fieldInjections = getFieldInjections(cls);
if (hasFieldInjections) {
  // 인자 없이 인스턴스 생성 후 필드 주입
  const instance = new cls();
  for (const [fieldName, token] of Object.entries(fieldInjections)) {
    instance[fieldName] = this.resolve(token);
  }
  return instance;
}
// 폴백: 레거시 생성자 인젝션
const params = paramTypes.map(t => this.resolve(t));
return new cls(...params);
```

`@Inject(token)` 필드 데코레이터는 `Class.__nexus_meta__`(표준 모드) 또는
`safeDefineMeta`(레거시 모드)에 인젝션 메타데이터를 저장합니다.
`getFieldInjections()` 헬퍼는 두 저장소를 모두 읽습니다.

### 생성자 인젝션 (레거시)

### 순환 의존성 감지

컨테이너는 `resolving: Set<InjectionToken>`을 추적하고, 한 번의 해석 중 같은 토큰을 두 번 만나면 `Error: Circular dependency detected for token "Foo"`를 던집니다. 에러 메시지는 사이클의 이름을 알려주므로 `useFactory` 우회를 도입하여 해결할 수 있습니다.

---

## 6. 스코프

| 스코프 | 동작 | 사용 사례 |
| ----- | --------- | -------- |
| `singleton` *(기본)* | 컨테이너당 인스턴스 1개 | 서비스, 리포지토리, 설정 |
| `transient` | `resolve()`마다 새 인스턴스 | 상태가 있는 헬퍼, 요청 스코프 빌더 |

```ts
@Module({
  providers: [
    UserService,                          // singleton
    { provide: 'REQUEST_ID', useFactory: () => crypto.randomUUID(), scope: 'transient' },
  ],
})
```

> **향후 스코프**: `request` 스코프(요청당 인스턴스 1개)는 v0.2에서 auth/session 미들웨어와 함께 추가될 예정입니다.

---

## 7. Exports

`exports: [...]`는 토큰을 **import하는** 모듈에서 사용할 수 있게 만듭니다. 프레임워크는 exports를 importing 부모에 factory 프로바이더로 구체화합니다.

```ts
@Module({
  providers: [AuthService],
  exports: [AuthService],
})
class AuthModule {}

@Module({
  imports: [AuthModule],
})
class AppModule {
  // 이제 AuthService는 AppModule의 컨테이너 체인에서 해석 가능합니다.
}
```

`exports`에 없는 것은 선언된 모듈 내부에 private으로 유지됩니다.

---

## 8. 공개 표면

| Export | 용도 |
| ------ | ------- |
| `DIContainer` | 컨테이너 클래스 자체 |
| `ApplicationContainer` | `registerModule()`을 가진 특수화된 루트 컨테이너 |
| `ModuleScanner` | 모듈 그래프를 순회 |
| `InjectionToken`, `Provider`, `ModuleOptions` | 타입 정의 |
| `@Module`, `@Injectable`, `@Inject`, `@Controller`, `@Repository` | 데코레이터 ([`../../src/core/decorators`](../../src/core/decorators) 참조) |

위는 모두 `@nexusts/core` 진입점에서 다시 export됩니다.

---

## 9. 설계 결정

| 결정 | 근거 |
| -------- | --------- |
| **명시적 `@Inject(...)`** 필수 | Bun transformer, `tsc`, `ts-node` 모두에서 휴대 가능. |
| **모듈당 컨테이너** | 캡슐화, 감사 가능성, 쉬운 mocking. |
| **지연 인스턴스화** | 프로바이더가 실제로 해석되는 경우에만 부팅 시 실패가 드러남. |
| **즉시 스캔** | 모든 모듈은 `new Application(...)`에서 순회 — 요청 시점이 아닌 부팅 시점 에러. |
| **순환 감지** | 정확한 에러로 아키텍처 실수를 일찍 드러냄. |

---

## 10. 향후 작업

- **`request` 스코프** — AsyncLocalStorage로 HTTP 요청 하나에 인스턴스를 묶습니다. (v0.2)
- **조건부 프로바이더** — `{ provide: X, useFactory: ..., when: () => process.env.X }`로 환경 기반 와이어링.
- **멀티 바인딩** — 플러그인 스타일 모듈을 위한 `forRoot({ providers: [...] })` 정적 헬퍼.
