/**
 * Bun runtime adapter.
 *
 * Uses Bun's native HTTP server (Bun.serve) which is built on top of
 * uWebSockets and provides the fastest HTTP throughput in JavaScript.
 *
 * Usage:
 *   const { bunAdapter } = await import('@nexusts/runtime');
 *   bunAdapter(honoApp, 3000);
 */
import type { Hono } from "hono";

export interface BunAdapterOptions {
	port?: number;
	/** Optional WebSocket config for Bun.serve (returned by createBunWebSocket()). */
	websocket?: any;
}

export function bunAdapter(app: Hono, portOrOpts: number | BunAdapterOptions = 3000): any {
	const Bun = (globalThis as any).Bun;
	if (!Bun || typeof Bun.serve !== "function") {
		throw new Error("bunAdapter() requires the Bun runtime.");
	}

	const opts: BunAdapterOptions =
		typeof portOrOpts === "number" ? { port: portOrOpts } : portOrOpts;

	const serveConfig: any = {
		port: opts.port ?? 3000,
		fetch: (req: Request, server: any) => {
			// Pass the Bun server object as the 3rd argument (env) so Hono's
			// upgradeWebSocket and other Bun-specific features can access it.
			return app.fetch(req, { server });
		},
		error: (err: Error) => {
			console.error("[bun-adapter] error:", err);
			return new Response("Internal Server Error", { status: 500 });
		},
	};

	// Pass the websocket config if provided (required for WebSocket support).
	if (opts.websocket) {
		serveConfig.websocket = opts.websocket;
	}

	const server = Bun.serve(serveConfig);

	console.log(`[nexus] Listening on http://localhost:${server.port}`);
	return server;
}
