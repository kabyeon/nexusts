# View Engines

> 한국어 버전: [`view-engines.ko.md`](./view-engines.ko.md)

NexusJS ships with three view-engine integrations and a pluggable
adapter interface for your own.

| Engine | Style | Best for |
| ------ | ----- | -------- |
| **Rendu** *(default)* | PHP-style `<%= ... %>` and `<% ... %>` | Edge runtimes, fast cold-starts |
| **Edge** | Mustache-style `{{ ... }}`, AdonisJS-compatible | Existing Adonis templates, designers |
| **Inertia** | Server returns a page object; client renders | SPA UX with server-side routing |

The default adapter is **Rendu**. Switch with `app.setViewAdapter(...)`.

---

## 1. Rendu (default)

Rendu compiles templates to render functions, so it's fast on every
runtime and works in Cloudflare Workers without filesystem access.

```ts
import { RenduAdapter } from 'nexusjs/view';

const rendu = new RenduAdapter();
const html = await rendu.render(
  `<h1>Hello, <?= name ?>!</h1>
   <? for (const item of items) { ?>
     <li><?= item ?></li>
   <? } ?>`,
  { name: 'Nexus', items: ['a', 'b', 'c'] }
);
```

### Using it from a controller

```ts
@Get('/about')
async about() {
  return {
    view: `
      <h1>About Nexus</h1>
      <p>Founded <?= year ?>.</p>
    `,
    data: { year: 2026 },
  };
}
```

The `view` key is the template string; `data` is the context.

### Compiled template caching

Rendu compiles each unique template once per adapter instance and
caches the render function in a `Map`. Re-rendering the same template
is essentially free after the first call.

---

## 2. Edge (AdonisJS-compatible)

Edge is AdonisJS's official template engine — `{{ ... }}` for output,
`{{{ ... }}}` for raw output, and `@if` / `@each` directives.

```ts
import { EdgeAdapter } from 'nexusjs/view';

const edge = new EdgeAdapter();
const html = await edge.render(
  `@if(user)
    <h1>Welcome, {{ user.name }}</h1>
  @else
    <h1>Please log in</h1>
  @end
`,
  { user: { name: 'Alice' } }
);
```

If you have existing Edge templates, the syntax carries over directly.

---

## 3. Inertia

Inertia is **a different paradigm**: the server returns a page object
(component name + props), the client renders it. See
**[inertia.md](./inertia.md)** for the full guide.

```ts
@Get('/users')
index(@Inject(Inertia.TOKEN) inertia: Inertia) {
  return inertia.render('Users/Index', { users: this.users.findAll() });
}
```

---

## 4. Writing your own adapter

Implement the `ViewAdapter` interface and install it:

```ts
import type { ViewAdapter } from 'nexusjs/view';

class MyEngine implements ViewAdapter {
  readonly name = 'my-engine';

  async render(
    template: string,
    data: Record<string, any>,
    context?: ViewContext,
    options?: ViewOptions,
  ): Promise<string> {
    // ... your engine here
    return compiledOutput;
  }

  compile?(template: string, options?: ViewOptions) {
    // optional: cache compiled render functions
  }
}

app.setViewAdapter(new MyEngine());
```

The adapter must be **runtime-agnostic** — no Node-only APIs, no
filesystem access at render time. (Compilation may touch the
filesystem; rendering must not.)

---

## 5. View context

Every render call receives a `ViewContext`:

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

This lets templates read request data and emit response directives
(cookies, redirects) without coupling to the framework's internals.

---

## 6. View options

```ts
interface ViewOptions {
  stream?: boolean;     // render chunks instead of one big string
  raw?: boolean;        // disable HTML escaping (caller is responsible)
  layout?: string;      // wrap the rendered view in a layout
}
```

`stream: true` is useful for very large pages or SSR streaming
responses. `raw: true` is dangerous — never enable it for
user-provided content.

---

## 7. Rendering helpers

### `app.render(view, data)`

Convenience wrapper around the configured adapter:

```ts
const html = await app.render('pages/about.edge', { team: 'Nexus' });
```

### Controller shortcut

Returning `{ view, data }` from a handler invokes the configured
adapter automatically:

```ts
@Get('/about')
async about() {
  return {
    view: 'pages/about.edge',   // template source
    data: { team: 'Nexus' },
  };
}
```

### File-based views (load from disk)

If the `view` value ends in a known view file extension (`.html`,
`.edge`, `.rendu`, `.eta`) AND `setViewPaths()` has been called,
the framework loads the file from the first matching directory
and uses its contents as the template source. Otherwise the
string is treated as inline source (the default above).

Configure once at boot:

```ts
// src/app/main.ts
import { setViewPaths } from 'nexusjs/view';
setViewPaths(['views', 'src/app/views']);
```

Or in `nx.config.ts`:

```ts
export default {
  view: 'rendu',
  viewPaths: ['views', 'src/app/views'],
  // ...
};
```

Then controllers can reference files directly:

```ts
@Get('/about')
async about() {
  return { view: 'about.html', data: { year: 2026 } };
}
```

`views/about.html`:

```html
<h1>About Nexus</h1>
<p>Founded <?= year ?>.</p>
```

The first directory containing `about.html` wins. If the file
isn't found in any configured directory, the request fails
with a clear error message naming the searched paths.

> **Edge runtimes** (Cloudflare Workers) have no filesystem.
> Leave `viewPaths` empty and pass inline template strings
> instead.

Top-level data values are coerced to strings before being
passed to Rendu, so `<?= year ?>` with `year: 2026` renders
`2026` (not the `TextDecoder.decode()` error that Rendu 0.1.0
throws for non-string chunks). For arithmetic in templates,
wrap explicitly: `<?= Number(count) + 1 ?>`.

### Direct response

For full control, build a Response manually:

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

## 8. Picking an engine

| Need | Pick |
| ---- | ---- |
| Edge runtime (Workers) | **Rendu** |
| AdonisJS template compatibility | **Edge** |
| SPA UX without writing an API | **Inertia** |
| React / Vue / Svelte rendering | **Inertia** + SSR adapter |
| Static email templates | **Rendu** or **Edge** |
| Markdown rendering | Write your own (see §4) |
