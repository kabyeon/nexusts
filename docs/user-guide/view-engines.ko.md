# 뷰 엔진

> English version: [`view-engines.md`](./view-engines.md)

NexusJS는 세 가지 뷰 엔진 통합과 자체 어댑터를 위한 플러그인 가능한 인터페이스를 제공합니다.

| 엔진 | 스타일 | 최적 용도 |
| ------ | ----- | -------- |
| **Rendu** *(기본값)* | PHP 스타일 `<%= ... %>` 및 `<% ... %>` | 엣지 런타임, 빠른 콜드 스타트 |
| **Edge** | Mustache 스타일 `{{ ... }}`, AdonisJS 호환 | 기존 Adonis 템플릿, 디자이너 |
| **Inertia** | 서버가 페이지 객체를 반환; 클라이언트가 렌더링 | 서버 사이드 라우팅이 있는 SPA UX |

기본 어댑터는 **Rendu**입니다. `app.setViewAdapter(...)`로 전환하세요.

---

## 1. Rendu (기본값)

Rendu는 템플릿을 렌더 함수로 컴파일하므로 모든 런타임에서 빠르며 파일 시스템 액세스 없이 Cloudflare Workers에서 동작합니다.

```ts
import { RenduAdapter } from 'nexus/view';

const rendu = new RenduAdapter();
const html = await rendu.render(
  `<h1>안녕하세요, <?= name ?>님!</h1>
   <? for (const item of items) { ?>
     <li><?= item ?></li>
   <? } ?>`,
  { name: 'Nexus', items: ['a', 'b', 'c'] }
);
```

### 컨트롤러에서 사용

```ts
@Get('/about')
async about() {
  return {
    view: `
      <h1>Nexus 소개</h1>
      <p>설립 <?= year ?>년.</p>
    `,
    data: { year: 2026 },
  };
}
```

`view` 키는 템플릿 문자열이며, `data`는 컨텍스트입니다.

### 컴파일된 템플릿 캐싱

Rendu는 각 고유 템플릿을 어댑터 인스턴스당 한 번 컴파일하고 렌더 함수를 `Map`에 캐시합니다. 같은 템플릿의 재렌더링은 첫 호출 이후 거의 무료입니다.

---

## 2. Edge (AdonisJS 호환)

Edge는 AdonisJS의 공식 템플릿 엔진입니다 — 출력용 `{{ ... }}`, raw 출력용 `{{{ ... }}}`, `@if` / `@each` 디렉티브.

```ts
import { EdgeAdapter } from 'nexus/view';

const edge = new EdgeAdapter();
const html = await edge.render(
  `@if(user)
    <h1>환영합니다, {{ user.name }}님</h1>
  @else
    <h1>로그인해 주세요</h1>
  @end
`,
  { user: { name: 'Alice' } }
);
```

기존 Edge 템플릿이 있다면 문법이 그대로 호환됩니다.

---

## 3. Inertia

Inertia는 **다른 패러다임**입니다 — 서버는 페이지 객체(컴포넌트 이름 + props)를 반환하고 클라이언트가 렌더링합니다. 자세한 가이드는 **[inertia.md](./inertia.md)**를 참조하세요.

```ts
@Get('/users')
index(@Inject(Inertia.TOKEN) inertia: Inertia) {
  return inertia.render('Users/Index', { users: this.users.findAll() });
}
```

---

## 4. 자체 어댑터 작성

`ViewAdapter` 인터페이스를 구현하고 설치하세요.

```ts
import type { ViewAdapter } from 'nexus/view';

class MyEngine implements ViewAdapter {
  readonly name = 'my-engine';

  async render(
    template: string,
    data: Record<string, any>,
    context?: ViewContext,
    options?: ViewOptions,
  ): Promise<string> {
    // ... 여기에 엔진 로직
    return compiledOutput;
  }

  compile?(template: string, options?: ViewOptions) {
    // 선택: 컴파일된 렌더 함수 캐시
  }
}

app.setViewAdapter(new MyEngine());
```

어댑터는 **런타임 무관**이어야 합니다 — Node 전용 API 없음, 렌더 시 파일 시스템 액세스 없음. (컴파일은 파일 시스템을 만져도 되지만 렌더링은 안 됨.)

---

## 5. 뷰 컨텍스트

모든 렌더 호출은 `ViewContext`를 받습니다.

```ts
interface ViewContext {
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string | string[]>;
    cookies?: Record<string, string>;
  };
  response?: {
    cookies?: Array<{ name: string; value: string; options?: Record<string, any> }>;
    redirect?: string;
    status?: number;
  };
  globals?: Record<string, any>;
}
```

이를 통해 템플릿은 프레임워크 내부에 결합되지 않고 요청 데이터를 읽고 응답 디렉티브(쿠키, 리다이렉트)를 내보낼 수 있습니다.

---

## 6. 뷰 옵션

```ts
interface ViewOptions {
  stream?: boolean;     // 하나의 큰 문자열 대신 청크 렌더링
  raw?: boolean;        // HTML 이스케이프 비활성화 (호출자가 책임짐)
  layout?: string;      // 렌더링된 뷰를 레이아웃으로 감쌈
}
```

`stream: true`는 매우 큰 페이지나 SSR 스트리밍 응답에 유용합니다. `raw: true`는 위험합니다 — 사용자 제공 콘텐츠에는 절대 활성화하지 마세요.

---

## 7. 렌더링 헬퍼

### `app.render(view, data)`

설정된 어댑터의 편의 래퍼.

```ts
const html = await app.render('pages/about.edge', { team: 'Nexus' });
```

### 컨트롤러 단축키

핸들러에서 `{ view, data }`를 반환하면 설정된 어댑터가 자동으로 호출됩니다.

```ts
@Get('/about')
async about() {
  return {
    view: 'pages/about.edge',   // 템플릿 소스
    data: { team: 'Nexus' },
  };
}
```

### 직접 응답

전체 제어를 위해 Response를 수동으로 빌드합니다.

```ts
@Get('/about')
async about() {
  const html = await app.render('pages/about.edge', { team: 'Nexus' });
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
```

---

## 8. 엔진 선택

| 필요 | 선택 |
| ---- | ---- |
| 엣지 런타임 (Workers) | **Rendu** |
| AdonisJS 템플릿 호환성 | **Edge** |
| API 작성 없는 SPA UX | **Inertia** |
| React / Vue / Svelte 렌더링 | **Inertia** + SSR 어댑터 |
| 정적 이메일 템플릿 | **Rendu** 또는 **Edge** |
| Markdown 렌더링 | 자체 작성 (§4 참조) |
