# 뷰 엔진

> English version: [`view-engines.md`](./view-engines.md)

NexusTS는 세 가지 뷰 엔진 통합과 자체 어댑터를 위한 플러그인 가능한 인터페이스를 제공합니다.

| 엔진 | 스타일 | 최적 용도 | 파일 확장자 |
| ------ | ----- | -------- | -------------- |
| **Rendu** *(기본값)* | PHP 스타일 `<%= ... %>` 및 `<% ... %>` | 엣지 런타임, 빠른 콜드 스타트 | `.html`, `.rendu` |
| **Edge** | Mustache 스타일 `{{ ... }}`, AdonisJS 호환 | 기존 Adonis 템플릿, 디자이너 | `.edge` |
| **Eta** | EJS 스타일 `<%= ... %>`, `<% ... %>` 루프, 부분 템플릿 | 풀 기능, EJS 사용자 친화 | `.eta` |
| **Inertia** | 서버가 페이지 객체를 반환; 클라이언트가 렌더링 | SPA UX (서버 사이드 라우팅) | — |

**파일 확장자에 따라 어댑터가 자동 선택**됩니다. §3 참조.

---

## 1. Rendu (기본값)

Rendu는 템플릿을 렌더 함수로 컴파일하므로 모든 런타임에서 빠르며 파일 시스템 액세스 없이 Cloudflare Workers에서 동작합니다.

```ts
import { RenduAdapter } from '@nexusts/view';

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
import { EdgeAdapter } from '@nexusts/view';

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

## 3. Eta

[Eta](https://eta.js.org/)는 가볍고 성능 좋은 EJS 호환 템플릿 엔진입니다.
EJS나 PHP를 사용해본 사람에게 즉시 익숙한 문법:

- `<%= expr %>` — HTML 이스케이프된 출력
- `<%- expr %>` — raw (이스케이프 없는) 출력
- `<% code %>` — 임의 JavaScript 제어 흐름
- `<%~ include('partial') %>` — 부분 템플릿 포함

Rendu와 Eta는 비슷한 구분 기호를 공유하지만, Eta는 더 많은 내장
기능을 제공합니다: 필터, 사용자 정의 태그, 템플릿 상속, 비동기 렌더링.
선택적 의존성으로 설치:

```
bun add eta
```

```ts
import { EtaAdapter } from '@nexusts/view';

const eta = new EtaAdapter();

// 보간
const html = await eta.render('<h1><%= it.title %></h1>', { title: 'Hello' });

// 조건문
const html2 = await eta.render(
  `<% if (it.show) { %><p>visible</p><% } %>`,
  { show: true },
);

// 반복문
const html3 = await eta.render(
  `<ul><% it.items.forEach(function(item) { %><li><%= item %></li><% }) %></ul>`,
  { items: ['a', 'b', 'c'] },
);
```

### 핵심 차이: `it` 접두사

Eta는 데이터를 `it.*`(데이터 백)를 통해 노출하며, 변수 이름 자체가
아닙니다. 이렇게 하면 스코프가 명확해지고 템플릿 코드의 지역 변수와
이름 충돌을 피할 수 있습니다.

```eta
<h1><%= it.title %></h1>
<% if (it.user) { %>
  <p>환영합니다, <%= it.user.name %>님!</p>
<% } %>
```

### 컨트롤러에서 (파일 기반)

뷰 디렉토리 중 하나에 `.eta` 확장자 파일을 만드세요:

```eta
{{! views/about.eta }}
<h1><%= it.title %></h1>
<p>설립 <%= it.year %>년.</p>
```

```ts
setViewPaths(['views']);

@Get('/about')
async about() {
  return { view: 'about.eta', data: { title: 'NexusTS', year: 2026 } };
}
```

프레임워크가 `.eta` 확장자를 감지하고 자동으로 `EtaAdapter`를
사용합니다. 어댑터는 지연 로드됩니다 — `.eta` 파일을 사용하지
않으면 `eta` 패키지는 절대 임포트되지 않습니다.

### 컴파일 캐시

`EtaAdapter`는 컴파일된 렌더 함수를 내부에 캐시합니다. 같은
템플릿 문자열의 재렌더링은 Map 조회 + 함수 호출일 뿐 —
재컴파일이 없습니다.

---

## 4. Inertia

Inertia는 **다른 패러다임**입니다 — 서버는 페이지 객체(컴포넌트 이름 + props)를 반환하고 클라이언트가 렌더링합니다. 자세한 가이드는 **[inertia.md](./inertia.md)**를 참조하세요.

```ts
@Get('/users')
index(@Inject(Inertia.TOKEN) inertia: Inertia) {
  return inertia.render('Users/Index', { users: this.users.findAll() });
}
```

---

## 5. 자체 어댑터 작성

`ViewAdapter` 인터페이스를 구현하고 설치하세요.

```ts
import type { ViewAdapter } from '@nexusts/view';

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

## 6. 뷰 컨텍스트

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

## 7. 뷰 옵션

```ts
interface ViewOptions {
  stream?: boolean;     // 하나의 큰 문자열 대신 청크 렌더링
  raw?: boolean;        // HTML 이스케이프 비활성화 (호출자가 책임짐)
  layout?: string;      // 렌더링된 뷰를 레이아웃으로 감쌈
}
```

`stream: true`는 매우 큰 페이지나 SSR 스트리밍 응답에 유용합니다. `raw: true`는 위험합니다 — 사용자 제공 콘텐츠에는 절대 활성화하지 마세요.

---

## 8. 렌더링 헬퍼

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

### 파일 기반 뷰 (디스크에서 로드)

`view` 값이 알려진 뷰 파일 확장자(`.html`, `.edge`, `.rendu`, `.eta`)
로 끝나고 `setViewPaths()`가 호출된 경우, 프레임워크가 첫 번째
일치하는 디렉토리에서 파일을 로드하여 템플릿 소스로 사용합니다.

**어댑터는 파일 확장자에 따라 자동 선택**됩니다:

| 확장자 | 어댑터 |
|-----------|---------|
| `.html`, `.rendu` | `RenduAdapter` (기본값) |
| `.edge` | `EdgeAdapter` |
| `.eta` | `EtaAdapter` |

즉, 같은 프로젝트에서 다른 엔진의 템플릿을 **혼용**할 수 있습니다.
올바른 파일 확장자만 사용하면 됩니다. `view` 문자열에 인식된
확장자가 없으면 `RenduAdapter`가 폴백으로 사용됩니다.

`app.setViewAdapter(new MyAdapter())`로 전역 기본 어댑터를
재정의할 수 있지만, 대부분의 프로젝트에서는 확장자별 자동 선택으로
충분합니다.

Application은 부트 시 nx.config.ts에서 viewPaths를 자동 감지하므로,
별도의 호출이 필요하지 않습니다:

```ts
// nx.config.ts — 이것만 있으면 됨
export default {
  view: 'rendu',
  viewPaths: 'resources/views',
};
```

런타임에 재정의하려면 (예: 테스트), Application 인스턴스에서
호출:

```ts
// app/main.ts
app.setViewPaths('other/path');
```

그러면 컨트롤러가 파일을 직접 참조할 수 있습니다:

```ts
@Get('/about')
async about() {
  return { view: 'about.html', data: { year: 2026 } };
}
```

`views/about.html`:

```html
<h1>Nexus 소개</h1>
<p>설립 <?= year ?>년.</p>
```

첫 번째로 `about.html`을 포함하는 디렉토리가 사용됩니다. 파일이
설정된 디렉토리에서 발견되지 않으면 검색된 경로를 명시하는
명확한 오류 메시지와 함께 요청이 실패합니다.

> **엣지 런타임**(Cloudflare Workers)에는 파일 시스템이 없습니다.
> `viewPaths`를 비워두고 인라인 템플릿 문자열을 대신 전달하세요.

최상위 데이터 값은 Rendu에 전달되기 전에 문자열로 강제 변환되므로
`<?= year ?>`에서 `year: 2026`은 `2026`을 렌더링합니다
(Rendu 0.1.0이 비문자열 청크에 대해 던지는 `TextDecoder.decode()`
오류 방지). 템플릿 내에서 산술이 필요한 경우 명시적으로 감싸세요:
`<?= Number(count) + 1 ?>`.

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

## 9. 엔진 선택

| 필요 | 선택 |
| ---- | ---- |
| 엣지 런타임 (Workers) | **Rendu** |
| AdonisJS 템플릿 호환성 | **Edge** |
| EJS 스타일 문법, 필터, 부분 템플릿 | **Eta** |
| API 작성 없는 SPA UX | **Inertia** |
| React / Vue / Svelte 렌더링 | **Inertia** + SSR 어댑터 |
| 정적 이메일 템플릿 | **Rendu** 또는 **Edge** |
| Markdown 렌더링 | 자체 작성 (§5 참조) |
