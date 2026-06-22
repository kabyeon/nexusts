# 06 · Rendu Views

Server-rendered HTML with the **Rendu** template engine (PHP-style
`<?= expr ?>`). Templates are auto-loaded from `views/`.

## What it shows

- Rendu template syntax: `<?= ?>` for output, `<? for () { } ?>` for blocks
- Returning `{ view: 'name.html', data: {...} }` from a controller
- `setViewPaths('views')` — or auto-loaded from `nx.config.ts`
- Static asset serving via `StaticModule.mount()`

## How to run

```bash
cd examples/06-rendu-views
bun main.ts
```

Then open `http://localhost:3000/` — you'll see a rendered HTML page.

## Layout

```
06-rendu-views/
├── main.ts
├── nx.config.ts        # viewPaths: 'views'
├── views/
│   ├── layout.html
│   ├── home.html
│   └── user.html
└── public/             # served at /static/*
```

## Templates

```html
<!-- views/home.html -->
<!DOCTYPE html>
<html>
  <head><title>Home</title></head>
  <body>
    <h1>Hello, <?= name ?>!</h1>
    <ul>
      <? for (const item of items) { ?>
        <li><?= item ?></li>
      <? } ?>
    </ul>
  </body>
</html>
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Controller, Get, Module, Injectable, StaticModule } from "@nexusts/core";

@Controller("/")
class PageController {
  @Get("/")
  home() {
    return { view: "home.html", data: { name: "NexusTS", items: ["alpha", "beta"] } };
  }

  @Get("/users/:id")
  user(@Injectable() @Param("id") id: string) {
    return { view: "user.html", data: { id: Number(id) } };
  }
}

@Module({
  imports: [
    StaticModule.mount({ root: "./public", prefix: "/static" }),
  ],
  controllers: [PageController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

```ts
// nx.config.ts (optional — auto-detected by the framework)
export default {
  view: "rendu",
  viewPaths: "views",
  // ...
};
```

## Auto-detection by extension

`@nexusts/view` picks the adapter based on the file extension:

- `.html` / `.rendu` → RenduAdapter
- `.edge` → EdgeAdapter
- `.eta` → EtaAdapter

Rendu is the default — it works on every runtime (Bun, Node, Cloudflare Workers).

## Layouts (Rendu)

Rendu supports `<? extends 'layout.html' ?>` style layouts. See [docs/user-guide/view-engines.md](../../docs/user-guide/view-engines.md) for the full template reference.
