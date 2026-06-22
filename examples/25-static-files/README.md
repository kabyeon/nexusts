# 25 · Static Files

Serve static assets (CSS, JS, images) from a local directory.

## What it shows

- `StaticModule.mount({ root, prefix })` middleware factory
- Use with `app.server.app.use('/static/*', staticMiddleware)`
- Serves files with correct MIME types
- ETag, Last-Modified, Range support out of the box

## How to run

```bash
cd examples/25-static-files
bun main.ts
```

```bash
# Files served at /static/* (configurable prefix)
curl -I http://localhost:3000/static/style.css
curl -I http://localhost:3000/static/logo.png
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { StaticModule } from "@nexusts/static";
import path from "node:path";

@Injectable()
@Controller("/")
class HomeController {
  @Get("/")
  home() {
    return {
      message: "Static files served at /static/*",
      assets: ["/static/style.css", "/static/logo.png", "/static/app.js"],
    };
  }
}

@Module({
  controllers: [HomeController],
})
class AppModule {}

const app = new Application(AppModule);

// Serve files from ./public at the /static/* URL prefix
const staticMiddleware = StaticModule.mount({
  root: path.join(import.meta.dir, "public"),
  prefix: "/static",
});
app.server.app.use("/static/*", staticMiddleware);

await app.listen(3000);
```

## Directory structure

```
25-static-files/
├── main.ts
├── README.md
└── public/
    ├── style.css
    ├── logo.png
    └── app.js
```

## Multiple roots

```ts
app.server.app.use("/static/*", StaticModule.mount({ root: "./public" }));
app.server.app.use("/assets/*", StaticModule.mount({ root: "./assets" }));
```

## Caching

`StaticModule` automatically sets `ETag`, `Last-Modified`, and respects
`If-None-Match` (304 Not Modified) and `If-Modified-Since` headers.

## Range requests

Partial content (`Range: bytes=0-100`) works out of the box — the response
will be `206 Partial Content` with the requested byte range.
