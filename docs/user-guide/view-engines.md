# View Engines

> 한국어 버전: [`view-engines.ko.md`](./view-engines.ko.md)

NexusJS ships with three view-engine integrations and a pluggable
adapter interface for your own.

| Engine | Style | Best for | File extension |
| ------ | ----- | -------- | -------------- |
| **Rendu** *(default)* | PHP-style `<%= ... %>` and `<% ... %>` | Edge runtimes, fast cold-starts | `.html`, `.rendu` |
| **Edge** | Mustache-style `{{ ... }}`, AdonisJS-compatible | Existing Adonis templates, designers | `.edge` |
| **Eta** | EJS-style `<%= ... %>`, `<% ... %>` loops, partials | Full-featured, familiar to EJS users | `.eta` |
| **Inertia** | Server returns a page object; client renders | SPA UX with server-side routing | — |

The adapter is selected **automatically** based on the file extension
of the `view` value. See §3.

---

## 1. Rendu (default)

Rendu compiles templates to render functions, so it's fast on every
runtime and works in Cloudflare Workers without filesystem access.

```ts
import { RenduAdapter } from '@kabyeon/nexusjs/view';

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
import { EdgeAdapter } from '@kabyeon/nexusjs/view';

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

## 3. Eta

[Eta](https://eta.js.org/) is a lightweight, performant EJS-compatible
templating engine. Syntax will be immediately familiar to anyone who
has used EJS or PHP:

- `<%= expr %>` — HTML-escaped output
- `<%- expr %>` — raw (unescaped) output
- `<% code %>` — arbitrary JavaScript control flow
- `<%~ include('partial') %>` — partial/include (from another string
  or file)

Rendu and Eta share similar delimiters, but Eta offers more built-in
features: filters, custom tags, template inheritance, and async
rendering. Install as an optional dependency:

```
bun add eta
```

```ts
import { EtaAdapter } from '@kabyeon/nexusjs/view';

const eta = new EtaAdapter();

// Interpolation
const html = await eta.render('<h1><%= it.title %></h1>', { title: 'Hello' });

// Conditionals
const html2 = await eta.render(
  `<% if (it.show) { %><p>visible</p><% } %>`,
  { show: true },
);

// Loops
const html3 = await eta.render(
  `<ul><% it.items.forEach(function(item) { %><li><%= item %></li><% }) %></ul>`,
  { items: ['a', 'b', 'c'] },
);
```

### Key difference: `it` prefix

Eta exposes data through `it.*` (the data bag), not bare variable
names. This is by design — it makes scope explicit and avoids naming
collisions with local variables in the template code.

```eta
<h1><%= it.title %></h1>
<% if (it.user) { %>
  <p>Welcome back, <%= it.user.name %>!</p>
<% } %>
```

### From a controller (file-based)

Create a file with a `.eta` extension in one of your view directories:

```eta
{{! views/about.eta }}
<h1>About {{= it.title }}</h1>
<p>Founded {{= it.year }}.</p>
```

```ts
setViewPaths(['views']);

@Get('/about')
async about() {
  return { view: 'about.eta', data: { title: 'NexusJS', year: 2026 } };
}
```

The framework detects the `.eta` extension and uses `EtaAdapter`
automatically. The adapter is lazy-loaded — if you never use `.eta`
files, the `eta` package is never imported.

### Compilation cache

`EtaAdapter` caches compiled render functions internally.
Re-rendering the same template string is a map lookup plus a
function call — no re-compilation.

---

## 4. Inertia

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

## 5. Writing your own adapter

Implement the `ViewAdapter` interface and install it:

```ts
import type { ViewAdapter } from '@kabyeon/nexusjs/view';

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

## 6. View context

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

## 7. View options

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

## 8. Rendering helpers

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
and uses its contents as the template source.

The **adapter is selected automatically** by the file extension:

| Extension | Adapter |
|-----------|---------|
| `.html`, `.rendu` | `RenduAdapter` (default) |
| `.edge` | `EdgeAdapter` |
| `.eta` | `EtaAdapter` |

This means you can mix templates from different engines in the
same project — just use the right file extension. If the `view`
string has no recognized extension, `RenduAdapter` is used as
the fallback.

Override the globally selected adapter with
`app.setViewAdapter(new MyAdapter())` if you need a custom
default, but for most projects the auto-selection by extension
is sufficient.

The Application auto-detects viewPaths from nx.config.ts at boot, so
usually no explicit call is needed:

```ts
// nx.config.ts — all you need
export default {
  view: 'rendu',
  viewPaths: 'resources/views',
};
```

To override at runtime (e.g. for testing), call on the Application
instance:

```ts
// app/main.ts
app.setViewPaths('other/path');
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

## 9. Picking an engine

| Need | Pick |
| ---- | ---- |
| Edge runtime (Workers) | **Rendu** |
| AdonisJS template compatibility | **Edge** |
| EJS-style syntax, filters, partials | **Eta** |
| SPA UX without writing an API | **Inertia** |
| React / Vue / Svelte rendering | **Inertia** + SSR adapter |
| Static email templates | **Rendu** or **Edge** |
| Markdown rendering | Write your own (see §5) |
