# 보안 미들웨어 · `@nexusts/shield`

> English version: [`shield.md`](./shield.md)

`@nexusts/shield`는 CSRF 보호, 보안 헤더(HSTS, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy), Content Security Policy를
제공합니다. AdonisJS Shield에서 영감을 받았습니다.

---

## 설치

shield 모듈은 `@nexusts/core` **내부**에 포함되어 있습니다 — 추가 설치가
필요 없습니다.

```ts
import { ShieldModule } from '@nexusts/shield';
```

---

## 빠른 시작

```ts
import { Module } from '@nexusts/core';
import { ShieldModule } from '@nexusts/shield';

@Module({
  imports: [
    ShieldModule.forRoot({
      csrf: { enabled: true },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
      xFrameOptions: 'DENY',
      xContentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    }),
  ],
})
export class AppModule {}
```

shield 미들웨어는 모든 응답에 전역으로 적용됩니다.

---

## CSRF 보호

**동기화 토큰 패턴**을 사용합니다: 안전한 요청(GET, HEAD, OPTIONS)에는
서명된 쿠키가 설정되고, 변경 요청(POST, PUT, DELETE, PATCH)은 헤더나
폼 필드에 토큰을 다시 반영해야 합니다.

### 설정

```ts
ShieldModule.forRoot({
  csrf: {
    enabled: true,
    cookie: {
      secure: true,           // HTTPS 전용
      sameSite: 'Strict',     // 또는 'Lax' / 'None'
    },
    secret: process.env.SHIELD_SECRET!,  // 토큰 서명에 사용
  },
});
```

### 동작 방식

1. **안전한 요청** — Shield가 임의의 서명되지 않은 값을 포함한
   `nexus-csrf` 쿠키를 설정합니다.
2. **변경 요청** — Shield가 쿠키 값을 다음 항목과 비교합니다:
   - `X-CSRF-Token` 헤더 (SPA에 권장)
   - `_csrf` 폼 필드 (전통적인 폼)
3. 쿠키와 헤더/폼 값이 일치해야 합니다. 헤더/폼 값은 시크릿으로
   **서명**되고, 쿠키는 **서명되지 않습니다**.

### 폼에서 CSRF 사용

```html
<form method="POST" action="/contact">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <button type="submit">전송</button>
</form>
```

컨트롤러에서 `ShieldService`를 통해 토큰을 발급:

```ts
class ContactController {
  constructor(@Inject(ShieldService.TOKEN) private shield: ShieldService) {}

  @Get('/contact')
  contactPage(@Res() res: any) {
    const t = this.shield.issueToken(res.headers);
    return { csrfToken: t.token };
  }
}
```

### SPA에서 CSRF 사용

`<meta>` 태그에서 토큰을 읽고 모든 변경 요청에 포함:

```html
<meta name="csrf-token" content="{{ csrfToken }}">
```

```ts
// fetch 사용
const token = document.querySelector('meta[name="csrf-token"]').content;
fetch('/api/data', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(data),
});
```

---

## 보안 헤더

### HSTS (Strict-Transport-Security)

```ts
ShieldModule.forRoot({
  hsts: {
    maxAge: 31_536_000,                // 1년
    includeSubDomains: true,
    preload: true,                     // 브라우저 프리로드 목록 제출
  },
});
```

### CSP (Content-Security-Policy)

```ts
ShieldModule.forRoot({
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdn.example.com'],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'api.example.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    reportOnly: false,      // true = 위반만 보고, 차단하지 않음
  },
});
```

### 기타 헤더

```ts
ShieldModule.forRoot({
  xFrameOptions: 'DENY',           // 또는 'SAMEORIGIN' / false
  xContentTypeOptions: true,       // 'nosniff' 설정
  referrerPolicy: 'strict-origin-when-cross-origin',
});
```

| 헤더 | 값 | 방어 대상 |
| ---- | --- | --------- |
| `X-Frame-Options` | `DENY` / `SAMEORIGIN` | 클릭재킹 |
| `X-Content-Type-Options` | `nosniff` | MIME 타입 스니핑 |
| `Referrer-Policy` | 설정 가능 | 리퍼러 유출 |

---

## CORS

`cors` 옵션을 추가하면 preflight(OPTIONS)와 모든 응답에 `Access-Control-*` 헤더를
자동으로 설정합니다. CSRF 보호와 함께 사용할 경우 OPTIONS preflight는 CSRF 검사를
우회하므로 브라우저의 사전 요청이 정상적으로 처리됩니다.

### 기본 설정

```ts
ShieldModule.forRoot({
  cors: {
    origin: ['https://app.example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
```

### origin 옵션

```ts
// 모든 출처 허용 (기본값, credentials와 함께 사용 불가)
cors: { origin: '*' }

// 단일 출처
cors: { origin: 'https://app.example.com' }

// 화이트리스트
cors: { origin: ['https://a.com', 'https://b.com'] }

// 커스텀 함수
cors: {
  origin: (requestOrigin) => requestOrigin.endsWith('.mycompany.com'),
}
```

### 전체 옵션 예시

```ts
ShieldModule.forRoot({
  cors: {
    origin: 'https://app.example.com',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86_400,       // preflight 캐시 24시간
  },
  csrf: { enabled: true },
});
```

> **주의:** `origin: '*'`과 `credentials: true`는 함께 사용할 수 없습니다.
> 특정 도메인으로 origin을 제한해야 credentials가 동작합니다.

---

## 서비스 직접 접근

```ts
import { Inject } from '@nexusts/core';
import { ShieldService } from '@nexusts/shield';

class FormController {
  constructor(@Inject(ShieldService.TOKEN) private shield: ShieldService) {}

  @Get('/contact')
  contactPage(@Res() res: any) {
    const t = this.shield.issueToken(res.headers);
    return { csrfToken: t.token, metaTag: t.html };
  }
}
```

---

## API 참조

### `ShieldModule.forRoot(config)`

| 파라미터 | 타입 | 기본값 | 설명 |
| -------- | ---- | ------ | ---- |
| `cors` | `CorsConfig \| false` | `false` | CORS 헤더 |
| `csrf` | `CsrfConfig \| false` | `{ enabled: true }` | CSRF 보호 |
| `hsts` | `HstsConfig \| false` | `false` | HSTS 헤더 |
| `csp` | `CspConfig \| false` | `false` | Content-Security-Policy |
| `xFrameOptions` | `'DENY' \| 'SAMEORIGIN' \| false` | `'SAMEORIGIN'` | X-Frame-Options |
| `xContentTypeOptions` | `boolean` | `true` | X-Content-Type-Options |
| `referrerPolicy` | `string \| undefined` | `undefined` | Referrer-Policy |
| `secret` | `string` | `NEXUS_SHIELD_SECRET` 환경변수 | 토큰 서명 시크릿 |

### `CorsConfig`

| 옵션 | 타입 | 기본값 | 설명 |
| ---- | ---- | ------ | ---- |
| `origin` | `string \| string[] \| function \| false` | `'*'` | 허용 출처 |
| `methods` | `string[]` | `GET POST PUT PATCH DELETE HEAD OPTIONS` | 허용 HTTP 메서드 |
| `allowedHeaders` | `string[]` | `undefined` | `Access-Control-Allow-Headers` |
| `exposedHeaders` | `string[]` | `undefined` | `Access-Control-Expose-Headers` |
| `credentials` | `boolean` | `false` | `Access-Control-Allow-Credentials` |
| `maxAge` | `number` | `undefined` | preflight 캐시 시간(초) |

### `CsrfConfig`

| 옵션 | 타입 | 기본값 | 설명 |
| ---- | ---- | ------ | ---- |
| `enabled` | `boolean` | — | CSRF 활성화 |
| `cookieName` | `string` | `'nexus-csrf'` | 쿠키 이름 |
| `headerName` | `string` | `'x-csrf-token'` | 헤더 이름 |
| `fieldName` | `string` | `'_csrf'` | 폼 필드 이름 |
| `protectGet` | `boolean` | `false` | 안전한 메서드에도 CSRF 적용 |
| `cookie` | `object` | — | 쿠키 속성 |
| `ignoreMethods` | `string[]` | `['GET','HEAD','OPTIONS']` | 안전한 메서드 목록 |

### `ShieldService`

| 메서드 | 설명 |
| ------ | ---- |
| `issueToken(headers)` | 새 CSRF 토큰 발급 및 쿠키 설정 |
| `middleware()` | Hono 미들웨어 가져오기 |

---

## 참고

- [`../design/shield.md`](../design/shield.md) — 디자인 문서
- [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md) — 횡단 관심사 모듈 개요
