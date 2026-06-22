// 30-inertia-vue-spa — minimal Vue 3 client.
//
//   Build: bun build ./frontend/app.js --outdir=./public \
//            --target=browser --format=esm --minify
//
//   This is plain `.js` (no JSX, no TSX) — Vue templates are
//   strings, so the file just imports `createApp`, `createInertiaApp`,
//   and the page component, then calls `createInertiaApp`.

import { createApp, h } from "vue";
import { createInertiaApp } from "@inertiajs/vue3";

createInertiaApp({
  resolve: (name) => {
    if (name === "Home") return Home;
    throw new Error(`Unknown page: ${name}`);
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el);
  },
});

const Home = {
  props: ["greeting", "count", "errors"],
  template: `
    <main style="font-family: system-ui, sans-serif; max-width: 560px; margin: 2em auto;">
      <h1>{{ greeting }}</h1>
      <p>Counter: <strong>{{ count }}</strong></p>

      <a
        href="/counter"
        method="post"
        as="button"
        style="display: inline-block; padding: 0.5em 1em; cursor: pointer;"
      >+1</a>

      <hr style="margin: 2em 0;">

      <h2>Tell us your name</h2>
      <form action="/greet" method="post">
        <input
          name="name"
          placeholder="Your name"
          style="padding: 0.4em; font-size: 1em;"
        />
        <p v-if="errors?.name" style="color: crimson; margin: 0.5em 0 0;">
          {{ errors.name }}
        </p>
        <button
          type="submit"
          style="margin-left: 0.5em; padding: 0.4em 1em;"
        >Greet me</button>
      </form>
    </main>
  `,
};