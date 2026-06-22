// 28-inertia-react-spa — minimal React client
//
//   This file is bundled by Bun at runtime (or pre-built) and served
//   at /static/app.js. It mounts the Inertia React adapter, then
//   renders the current `Home` page component.
//
//   Build: bun build ./frontend/app.tsx --outdir=./public \
//            --target=browser --format=esm --minify
//
//   Or let the dev server rebuild on save (see README).

import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { useState } from "react";

createInertiaApp({
  resolve: (name) => {
    if (name === "Home") return Home;
    throw new Error(`Unknown page: ${name}`);
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});

function Home({ greeting, count, errors }: any) {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "2em auto" }}>
      <h1>{greeting}</h1>
      <p>Counter: <strong>{count}</strong></p>

      {/* Inertia link — partial-reload friendly */}
      <a
        href="/counter"
        method="post"
        as="button"
        style={{ display: "inline-block", padding: "0.5em 1em", cursor: "pointer" }}
      >
        +1
      </a>

      <hr style={{ margin: "2em 0" }} />

      <h2>Tell us your name</h2>
      <form action="/greet" method="post">
        <input
          name="name"
          placeholder="Your name"
          style={{ padding: "0.4em", fontSize: "1em" }}
        />
        {errors?.name && (
          <p style={{ color: "crimson", margin: "0.5em 0 0" }}>{errors.name}</p>
        )}
        <button type="submit" style={{ marginLeft: "0.5em", padding: "0.4em 1em" }}>
          Greet me
        </button>
      </form>
    </main>
  );
}
