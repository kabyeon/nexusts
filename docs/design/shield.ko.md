# Shield 모듈 — 디자인

> English version: [`shield.md`](./shield.md)

이 문서는 `@nexusts/shield`의 아키텍처를 설명한다: CSRF
보호, 보안 헤더, 가드 구성 방식, 미들웨어 파이프라인.

## 목표

1. **심층 방어.** 변경 요청용 CSRF 토큰, HTTPS 강제를 위한 HSTS,
   XSS 완화를 위한 CSP, clickjacking / sniffing / referrer 보호를 위한
   표준 헤더 — 모두 한 모듈에.
2. **Synchronizer token 패턴 (double-submit 아님).** CSRF 토큰이 secret
   key로 서명되어 쿠키 값과 비교 검증. 많은 프레임워크가 사용하는
   double-submit-cookie 패턴보다 강함.
3. **AdonisJS 모양 API.** AdonisJS에서 오는 개발자에게 익숙. 같은
   가드, 같은 기본값.
4. **disabled 시 zero 오버헤드.** 각 가드는 개별적으로 비활성화
   (`false`) 가능. 비활성화된 가드는 tree-shake 가능 — 할당·실행 안 됨.

## 아키텍처

```
                  ┌───────────────────────────────┐
                  │       ShieldMiddleware          │
                  │  (단일 Hono 미들웨어)            │
                  │                                 │
                  │  ┌────────────┐  ┌───────────┐  │
                  │  │ CsrfGuard  │  │HeadersGuard│  │
                  │  │ (변경 요청)│  │ (전체)     │  │
                  │  │  403 |     │  │  HSTS      │  │
                  │  │  skip      │  │  CSP       │  │
                  │  │            │  │  XFO       │  │
                  │  │            │  │  XCTO      │  │
                  │  │            │  │  RP        │  │
                  │  └────────────┘  └───────────┘  │
                  └──────────────────────────────────┘
```

### 가드 구성

`ShieldService`가 모듈 init 시점에 가드를 구성. 각 가드는 독립적으로
설정 가능하고 독립적으로 비활성화. `ShieldService.middleware()`가 두
가드를 순차로 실행하는 단일 Hono 미들웨어 반환:

1. **CSRF 체크** — 핸들러 전. 변경 메서드 (POST, PUT, DELETE, PATCH)에
   적용. 실패 시 `403`.
2. **보안 헤더** — 응답 헤더 설정. 모든 요청에 실행 (CSRF 실패에도 —
   에러 응답 자체가 보호).

## CSRF 보호

### Synchronizer token 패턴

```
안전 요청 (GET):
  Server → Set-Cookie: nexus-csrf=<랜덤 unsigned 값>; Secure; SameSite
  Client → (쿠키 자동 전송)

변경 요청 (POST):
  Client → Cookie: nexus-csrf=<unsigned>
           Header: X-CSRF-Token=<같은 값의 signed 버전>
  Server → 검증: unsigned(쿠키) === signed(헤더).unsigned
           일치 → 허용. 불일치 → 403.
```

### 토큰 생명주기

1. **발급:** `CsrfGuard.issue(res)`가 랜덤 24-byte base64url 값을 생성,
   암호화 서비스로 서명, unsigned 값을 쿠키로 설정.
2. **검증:** `CsrfGuard.verify(req)`가 쿠키 값 추출, 서명된 헤더 값
   추출, 서명 검증, constant-time 비교로 unsigned 페이로드 비교
   (`EncryptionService.verifyRaw`에 위임).
3. **토큰 재사용:** 쿠키 값은 쿠키 수명 동안 유효. 헤더의 서명 값은
   쿠키 만료까지 한 번 발급 후 재사용 가능. 쿠키만 탈취한 공격자가
   서명된 헤더를 위조할 수 없으므로 안전.

### 서명 구성

```ts
function sign(raw: string, secret: string): string {
  const sig = new EncryptionService(secret).signRaw(raw, 'csrf');
  return `${raw}.${sig}`;
}
```

`'csrf'` purpose 태그가 도메인 간 토큰 재사용 방지 (예: CSRF 토큰이
session 토큰을 인증할 수 없음). 서명 스킴은 crypto 모듈의 디자인 참조.

### 쿠키 속성

| 속성 | 기본값 | 근거 |
|------|--------|------|
| `SameSite` | `Lax` | 최상위 네비게이션에 안전 |
| `Secure` | `true` | 프로덕션에서 HTTPS만 |
| `HttpOnly` | `false` | 클라이언트 JS가 meta 태그를 읽음; 쿠키 자체는 echo만 필요 |
| `Path` | `/` | 모든 라우트에 유효 |

`HttpOnly: false`는 의도적 — 브라우저가 모든 요청 (XHR/fetch 포함)에
쿠키를 보내야 하지만, 헤더의 토큰 값은 JS가 읽을 수 있어야 함. 쿠키 값
자체는 unsigned이고 서명 없이는 무의미.

## 보안 헤더

### HSTS (`Strict-Transport-Security`)

브라우저에게 해당 도메인에 HTTPS 사용 강제. `maxAge`, `includeSubDomains`,
`preload` 설정 가능. 기본값: `false` (opt-in, dev 서버에서 HSTS 설정은
귀찮음).

### CSP (`Content-Security-Policy`)

스크립트, 스타일, 이미지, 폰트 등의 허용 소스 화이트리스트. 디렉티브별
설정 가능. `reportOnly: true`는 `Content-Security-Policy-Report-Only`
헤더로 설정, 위반을 차단하지 않고 보고만. 기본값: `false`.

디렉티브 이름은 camelCase (`defaultSrc`)와 kebab-case (`default-src`) 둘 다
허용. 프레임워크가 내부적으로 kebab-case로 정규화.

### 기타 헤더

| 헤더 | 가드 | 기본값 | 효과 |
|------|------|--------|------|
| `X-Frame-Options` | Clickjacking | `SAMEORIGIN` | `<frame>`/`<iframe>` 내 임베드 방지 |
| `X-Content-Type-Options` | MIME sniffing | `true` (nosniff) | 엄격한 MIME 검사 강제 |
| `Referrer-Policy` | Referrer 누출 | `undefined` (opt-in) | `Referer` 헤더 제어 |

## DI 통합

```
ApplicationContainer
  └── ConfiguredShieldModule
        ├── ShieldService
        ├── ShieldService.TOKEN (Symbol alias)
        └── "SHIELD_CONFIG" (useValue: config)
```

`ShieldService`가 생성자에서 `SHIELD_CONFIG`를 읽고 가드 인스턴스화.
서비스는 class token과 Symbol token 둘 다로 export되어 `@Inject()`와 호환.

## Future work

- **CSRF 실패 rate-limit** — 토큰 추측 brute-force 방지.
- **Double-submit cookie 모드** — 서명된 토큰에 접근할 수 없지만 커스텀
  헤더 설정은 가능한 SPA용.
- **Webhook을 위한 CSRF 면제** — 특정 경로 (예: Stripe webhook
  `/stripe/webhook`)가 CSRF 체크를 건너뛰게 허용.
- **Reporting endpoint** — CSP 위반용 `report-uri` / `report-to`를
  프레임워크의 이벤트 시스템과 통합.

## 참고

- [`../user-guide/shield.ko.md`](../user-guide/shield.ko.md) — 사용자 가이드
- [`crypto.ko.md`](./crypto.ko.md) — 암호화 서비스
- [`../user-guide/cross-cutting-features.ko.md`](../user-guide/cross-cutting-features.ko.md) — 개요
