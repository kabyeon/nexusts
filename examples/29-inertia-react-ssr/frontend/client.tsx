// 29-inertia-react-ssr — client hydration entry point.
//
//   This file is the SPA's runtime entry. It mounts the same
//   `HomePage` component that the server already rendered into
//   `<div id="app">`, and Inertia takes care of calling
//   `hydrateRoot` (instead of `createRoot`) so the existing
//   server-rendered HTML is reused.
//
//   Build: bun build ./frontend/client.tsx --outdir=./public \
//            --target=browser --format=esm --minify

import { createInertiaApp } from "@inertiajs/react";
import { hydrateRoot } from "react-dom/client";
import { HomePage } from "./home.tsx";

createInertiaApp({
  resolve: (name) => {
    if (name === "Home") return HomePage;
    throw new Error(`Unknown page: ${name}`);
  },
  setup({ el, App, props }) {
    // hydrateRoot, NOT createRoot — this is what makes the
    // server-rendered HTML interactive without a full re-render.
    hydrateRoot(el, <App {...props} />);
  },
});
