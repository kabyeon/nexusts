/**
 * Svelte SSR adapter.
 *
 * Supports both Svelte 4 and Svelte 5. The runtime detection is done
 * dynamically:
 *
 * - Svelte 5 exposes `render(component, { props })` from `svelte/server`.
 * - Svelte 4 components have a `.render(props)` method on the
 *   component class itself.
 *
 * We try Svelte 5 first (the modern path) and fall back to Svelte 4.
 * Both packages are OPTIONAL peer dependencies.
 *
 * Usage:
 *
 * ```ts
 * // Svelte 5
 * import HomePage from './pages/Home.svelte';
 * import { createSvelteAdapter } from 'nexusjs/view/inertia/ssr';
 * app.inertia.setSsrAdapter(createSvelteAdapter({ components: { Home: HomePage } }));
 *
 * // Svelte 4 — same call; the adapter detects the API at runtime.
 * ```
 */
import type { SsrAdapter, SsrRenderResult } from "../types.js";
import { asRegistry, type ComponentRegistry } from "./registry.js";

export interface SvelteSsrOptions {
	components: ComponentRegistry | Record<string, any>;
}

export function createSvelteAdapter(options: SvelteSsrOptions): SsrAdapter {
	const registry = asRegistry(options.components);

	return {
		name: "svelte",
		async render(
			component: string,
			props: Record<string, any>,
		): Promise<SsrRenderResult> {
			const Component = registry.resolve(component);
			if (!Component) {
				throw new Error(
					`[inertia/svelte] Component "${component}" is not registered. ` +
						`Use createSvelteAdapter({ components: { ${component}: ... } }).`,
				);
			}

			// Svelte 5 path: `render(component, { props })`.
			try {
				const svelteServer = await import("svelte/server");
				if (typeof (svelteServer as any).render === "function") {
					const result = (svelteServer as any).render(Component, {
						props,
					});
					return {
						html: result.body ?? "",
						head: result.head ? [result.head] : [],
					};
				}
			} catch {
				// svelte/server not installed — try Svelte 4 fallback below.
			}

			// Svelte 4 path: the component itself has a `.render(props)`.
			if (typeof (Component as any)?.render === "function") {
				const result = (Component as any).render(props);
				return {
					html: result?.html ?? "",
					head: result?.head ? [result.head] : [],
				};
			}

			throw new Error(
				`[inertia/svelte] Could not render "${component}". ` +
					`Either install Svelte 5 (provides svelte/server) or use a Svelte 4 component class.`,
			);
		},
	};
}
