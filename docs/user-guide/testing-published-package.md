# Testing the published package locally

> 한국어 버전: [`testing-published-package.ko.md`](./testing-published-package.ko.md)

When you change a module, you want to verify it works **as published**
— not just inside the monorepo. Running the test suite (`bun run test`)
exercises the source under `src/`, but it doesn't catch problems with:

- `package.json` `exports` field misconfiguration
- `tsconfig.build.json` / `outDir` drift
- The `dist/` flatten step (see `build.ts` phase 3)
- Peer-dep handling (zod version conflicts, optional peer deps)
- CJS / ESM resolution edge cases

This guide covers **three ways to test the `dist/` folder** as if it
were the published package on npm. Pick the one that matches your
workflow.

---

## TL;DR — which method should I use?

| Workflow | Method |
| -------- | ------ |
| **Iterating on a module** (build → test → edit → repeat) | `bun link` |
| **Pre-PR sanity check** that the consumer story works | `file:` protocol |
| **Pre-publish final check** (matches `npm publish` exactly) | `npm pack` + tarball |

---

## Method 1 — `bun link` (recommended for development)

A symlink that survives `dist/` rebuilds. Set it up once, then forget
about it.

### One-time setup

```bash
# From the framework repo
bun run build
cd dist
bun link
cd ..

# From your test app
mkdir ~/nexusjs-sandbox && cd ~/nexusjs-sandbox
bun init -y
bun link nexusjs
```

### Day-to-day usage

```bash
# In the framework repo — edit, build, done. No reinstall.
bun run build

# In the test app — just run. The symlink auto-reflects the new dist/.
bun run dev
```

The `bun link` symlink points at `dist/`, so every rebuild takes
effect immediately. No `bun install` between cycles.

### When to use

- **Module development** — fastest feedback loop
- **Multi-runtime testing** — same `dist/` consumed by Bun, Node, etc.
- **Reproducing user-reported bugs** — the user's install is
  `npm install nexusjs`, and `bun link` is the closest equivalent
  inside the monorepo

---

## Method 2 — `file:` protocol (best for one-off checks)

Installs from a local path. `bun install` actually copies the package
into `node_modules`, so it's a true "fresh install" test.

### Steps

```bash
# 1. Build the framework
bun run build

# 2. Create a test app somewhere outside the framework repo
mkdir ~/nexusjs-sandbox && cd ~/nexusjs-sandbox
bun init -y

# 3. Add the dependency
bun add file:/absolute/path/to/@kabyeon/nexusjs/dist
# or, relative to the test app:
bun add file:../@kabyeon/nexusjs/dist
```

`bun install` copies `dist/` into `node_modules/@kabyeon/nexusjs/` and resolves
the `exports` field exactly as npm would.

### Verifying the install

```bash
# Confirm the package is installed from the local dist
ls -la node_modules/nexusjs
# → should show dist/ contents (index.js, cli/index.js, grpc/index.js, ...)

# Confirm the package.json is the consumer-facing one
cat node_modules/@kabyeon/nexusjs/package.json
# → { "name": "@kabyeon/nexusjs", "version": "0.5.0", "exports": {...}, ... }
```

### When to use

- **Pre-PR check** — ensure your changes don't break the published
  layout
- **CI integration** — fast, hermetic, no network
- **Reproducing a fresh install** — `file:` is the closest thing to
  `npm install nexusjs` without actually publishing

### Cleanup

```bash
rm -rf ~/nexusjs-sandbox
```

The `file:` install is self-contained in the test app's `node_modules`.

---

## Method 3 — `npm pack` (most thorough, matches `npm publish`)

`npm pack` creates a real `.tgz` tarball of the package. Installing
that tarball is byte-for-byte identical to what `npm install nexusjs`
does on the registry.

### Steps

```bash
# 1. Build the framework
bun run build

# 2. Pack it
cd dist
npm pack
# → nexusjs-0.5.0.tgz
cd ..

# 3. Install the tarball in a test app
mkdir ~/nexusjs-sandbox && cd ~/nexusjs-sandbox
bun init -y
bun add ../@kabyeon/nexusjs/dist/nexusjs-0.5.0.tgz
```

### When to use

- **Pre-publish final check** — `npm publish` uploads exactly the
  tarball `npm pack` produces
- **Catching npm-specific metadata issues** — `.npmignore`, `files`
  whitelist, license file inclusion
- **Cross-machine testing** — tarball is portable; you can scp it
  to a CI runner or another dev's laptop

### Cleanup

```bash
rm -rf ~/nexusjs-sandbox
rm dist/nexusjs-0.5.0.tgz
```

---

## Verification script

Whichever method you pick, the test app should at minimum verify
these three things:

```ts
// test-app/index.ts
import { Application, Module, Controller, Get } from "@kabyeon/nexusjs";
import { GrpcService } from "@kabyeon/nexusjs/grpc";
import { EventEmitter } from "@kabyeon/nexusjs/events";

@Controller("/")
class AppController {
  @Get("/")
  hello() {
    return { framework: "@kabyeon/nexusjs", version: "0.5.0" };
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

const app = new Application(AppModule);

// 1. The root export resolves and the Application class is a real class
console.assert(typeof Application === "function", "Application not exported");

// 2. Subpath exports resolve (deep import test)
console.assert(typeof GrpcService === "function", "@kabyeon/nexusjs/grpc subpath broken");
console.assert(typeof EventEmitter === "function", "@kabyeon/nexusjs/events subpath broken");

// 3. The CLI is exposed (note: the import path differs from the runtime API)
import cliPkg from "@kabyeon/nexusjs/cli";
console.assert(typeof cliPkg === "object", "@kabyeon/nexusjs/cli subpath broken");

// 4. DI + HTTP work end-to-end
const events = app.container.resolve(EventEmitter);
events.on("booted", () => console.log("✓ boot event fired"));

await app.listen(3000);
console.log("✓ listening on http://localhost:3000");
```

```bash
bun run test-app/index.ts
# → ✓ boot event fired
# → ✓ listening on http://localhost:3000

# In another terminal:
curl http://localhost:3000
# → {"framework":"@kabyeon/nexusjs","version":"0.5.0"}
```

If all three lines print, the `dist/` build is healthy.

---

## What this catches that `bun run test` doesn't

| Failure mode | `bun run test` | `dist/` test |
| ------------ | -------------- | ------------ |
| Decorator mis-registration in `src/` | ✅ catches | ❌ would catch |
| Wrong `exports` field in `package.json` | ❌ silently passes | ✅ catches |
| `tsconfig.build.json` drift | ❌ silently passes | ✅ catches |
| `dist/src/*` flattening broken | ❌ silently passes | ✅ catches (no `cli/index.js`) |
| Peer dep version mismatch | ❌ uses monorepo's | ✅ uses dist's |
| Optional peer dep missing at runtime | ❌ monorepo has it | ✅ catches the import error |
| CJS/ESM resolution edge case | ❌ monorepo resolves it | ✅ catches |

Rule of thumb: **run the test suite for fast feedback, run the
`dist/` test before opening a PR.**

---

## Troubleshooting

### `Cannot find module 'nexusjs'`

The `file:` install didn't pick up the package. Check:

```bash
ls node_modules/@kabyeon/nexusjs/package.json    # exists?
cat node_modules/@kabyeon/nexusjs/package.json | head -5
```

If the `package.json` is missing, the `file:` path was wrong. Use an
absolute path to avoid confusion.

### `Cannot find module '@kabyeon/nexusjs/grpc'`

The subpath export is missing or broken. Check `dist/`:

```bash
ls dist/grpc/
# → should have: decorators.d.ts, index.d.ts, index.js, module.d.ts, ...
```

If the directory is missing, your build excluded it. Check
`build.ts` `entrypoints` and `tsconfig.build.json` `include`.

### `SyntaxError: Unexpected token 'export'`

The file was emitted as CJS but you're importing it as ESM. Check:

```bash
head -1 dist/cli/index.js
# → should be ESM-compatible (no "use strict" prefix, no require())
```

If it starts with `"use strict"` or `Object.defineProperty(exports, ...)`,
the `format: "esm"` in `build.ts` is being overridden somewhere.

### Type errors at install time

`file:` and `bun link` use the consumer's `tsconfig.json`, not the
framework's. If a test app uses strict mode and the framework's
declarations are loose, you might see new errors. Fix in
`src/**` and rebuild.

---

## See also

- [`runtime-deployment.md`](./runtime-deployment.md) — production
  deployment (Bun / Node / Cloudflare)
- [`getting-started.md`](./getting-started.md) — first app walkthrough
- [`../README.md`](../../README.md) — repository layout
- [`build.ts`](../../build.ts) — what the build script does (and why
  phase 3 flattens `dist/src/*`)
