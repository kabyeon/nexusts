// 29-inertia-react-ssr — React page component for server-side rendering.
//
//   The same component is also imported by the hydration client
//   (frontend/client.tsx). The framework's `createReactAdapter`
//   calls `React.createElement(HomePage, props)` server-side, and
//   the client mounts the same component into the existing DOM.

export function HomePage({ greeting, count, errors }: any) {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "2em auto" }}>
      <h1>{greeting}</h1>
      <p>Counter: <strong>{count}</strong></p>

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
