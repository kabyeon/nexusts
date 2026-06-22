// 31-inertia-vue-ssr — shared Vue page component for SSR + client hydration.
//
//   The same component is also imported by the hydration client
//   (frontend/client.js). The framework's `createVueAdapter` does
//   `createSSRApp({ render() { return h(Component, props) } })`
//   server-side, and the client calls `createApp` with the same
//   component for hydration.

export const HomePage = {
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
        <button type="submit" style="margin-left: 0.5em; padding: 0.4em 1em;">
          Greet me
        </button>
      </form>
    </main>
  `,
};