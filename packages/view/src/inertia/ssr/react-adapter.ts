/**
 * React SSR adapter.
 *
 * Renders Inertia page components to HTML using `react-dom/server`.
 * The user's React component library (`react`, `react-dom`) must be
 * installed separately — we dynamic-import so the framework itself
 * stays frontend-agnostic.
 *
 * Usage:
 *
 * ```ts
 * import { createReactAdapter } from 'nexusjs/view/inertia/ssr';
 * import { HomePage, UsersIndexPage } from './pages';
 *
 * app.inertia.setSsrAdapter(createReactAdapter({
 *   components: { Home: HomePage, 'Users/Index': UsersIndexPage },
 * }));
 * ```
 *
 * Streaming is intentionally out of scope for the MVP; React 18+ users
 * can drop in `renderToPipeableStream` later. The default
 * `renderToString` is enough for first-paint and works on every
 * runtime (Bun, Node, Cloudflare Workers).
 */
import type { SsrAdapter, SsrRenderResult } from "../types.js";
import { asRegistry, type ComponentRegistry } from "./registry.js";

export interface ReactSsrOptions {
	/** Components, either a registry or a name→component map. */
	components: ComponentRegistry | Record<string, any>;
	/**
	 * Optional React `Fragment` wrapper for cases where the registered
	 * component returns multiple top-level elements. Not strictly
	 * required for Inertia (the adapter wraps everything in a single
	 * root via `<div id="app">`).
	 */
}

/** Build a React SSR adapter. */
export function createReactAdapter(options: ReactSsrOptions): SsrAdapter {
	const registry = asRegistry(options.components);

	return {
		name: "react",
		async render(
			component: string,
			props: Record<string, any>,
		): Promise<SsrRenderResult> {
			// Lazy imports — the framework must not force React as a
			// dependency. The user opts in by installing it.
			const [{ renderToString }, React] = await Promise.all([
				import("react-dom/server"),
				import("react"),
			]);

			const Component = registry.resolve(component);
			if (!Component) {
				throw new Error(
					`[inertia/react] Component "${component}" is not registered. ` +
						`Use createReactAdapter({ components: { ${component}: ... } }) ` +
						`or registry.register('${component}', Component).`,
				);
			}

			const element = (React as any).createElement(Component, props);
			const html = renderToString(element);
			return { html, head: [] };
		},
	};
}
