/**
 * Hono (raw) benchmark server — comparison baseline.
 *
 * Mirrors the same endpoints as the NexusTS server so both are measured
 * under identical load patterns.
 *
 * Run: bun benchmarks/servers/hono.ts [port]
 */

import { Hono } from "hono";

const app = new Hono();

// ── Middleware chain (10 no-op layers) ───────────────────────────────────────

for (let i = 0; i < 10; i++) {
  app.use("*", async (_c, next) => next());
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get("/hello", (c) => c.text("Hello from Hono!"));

app.get("/json", (c) =>
  c.json({
    message: "ok",
    framework: "hono",
    timestamp: Date.now(),
  })
);

app.get("/di", (c) => c.json({ result: "Hello, world!" }));

app.get("/middleware", (c) => c.json({ passed: 10 }));

// ── Bootstrap ────────────────────────────────────────────────────────────────

const port = Number(process.argv[2] ?? process.env.PORT ?? 3002);

export default {
  port,
  fetch: app.fetch,
};

console.log(`[hono] listening on http://localhost:${port}`);
