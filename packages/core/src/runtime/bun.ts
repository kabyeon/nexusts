/**
 * Bun runtime adapter.
 *
 * Uses Bun's native HTTP server (Bun.serve) which is built on top of
 * uWebSockets and provides the fastest HTTP throughput in JavaScript.
 *
 * Usage:
 *   const { bunAdapter } = await import('nexusjs/runtime');
 *   bunAdapter(honoApp, 3000);
 */
import type { Hono } from "hono";

export function bunAdapter(app: Hono, port: number = 3000): any {
	const Bun = (globalThis as any).Bun;
	if (!Bun || typeof Bun.serve !== "function") {
		throw new Error("bunAdapter() requires the Bun runtime.");
	}

	const server = Bun.serve({
		port,
		fetch: (req: Request) => app.fetch(req),
		error: (err: Error) => {
			console.error("[bun-adapter] error:", err);
			return new Response("Internal Server Error", { status: 500 });
		},
	});

	console.log(`[nexus] Listening on http://localhost:${server.port}`);
	return server;
}
