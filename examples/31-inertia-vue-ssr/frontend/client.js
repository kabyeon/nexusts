// 31-inertia-vue-ssr — client hydration entry point.
//
//   Build: bun build ./frontend/client.js --outdir=./public \
//            --target=browser --format=esm --minify
//
//   The client uses the same `createInertiaApp` adapter as the SPA
//   variant. The `setup` callback uses `createApp` (not `mount` with
//   a special hydration flag) — Vue's `createApp` automatically
//   hydrates when the target node already contains rendered HTML.

import { createApp, h } from "vue";
import { createInertiaApp } from "@inertiajs/vue3";
import { HomePage } from "./home.js";

createInertiaApp({
  resolve: (name) => {
    if (name === "Home") return HomePage;
    throw new Error(`Unknown page: ${name}`);
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el);
  },
});