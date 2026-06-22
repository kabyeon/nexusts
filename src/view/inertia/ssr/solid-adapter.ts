/**
 * Solid SSR adapter.
 *
 * Renders Inertia page components to HTML using Solid's SSR helpers
 * (`solid-js/web`'s `renderToString`). The Solid packages are
 * OPTIONAL peer dependencies.
 *
 * Usage:
 *
 * ```ts
 * import HomePage from './pages/Home';
 * import { createSolidAdapter } from 'nexusjs/view/inertia/ssr';
 *
 * app.inertia.setSsrAdapter(createSolidAdapter({
 *   components: { Home: HomePage },
 * }));
 * ```
 */
import type { SsrAdapter, SsrRenderResult } from "../types.js";
import { asRegistry, type ComponentRegistry } from "./registry.js";

export interface SolidSsrOptions {
	components: ComponentRegistry | Record<string, any>;
	/**
	 * Use `renderToStringAsync` (Suspense-aware) instead of the
	 * synchronous variant. Off by default; turn on if any of your
	 * components use Suspense / async resources.
	 */
	async?: boolean;
}

export function createSolidAdapter(options: SolidSsrOptions): SsrAdapter {
	const registry = asRegistry(options.components);
	const useAsync = options.async ?? false;

	return {
		name: "solid",
		async render(
			component: string,
			props: Record<string, any>,
		): Promise<SsrRenderResult> {
			const { renderToString, renderToStringAsync } = await import(
				"solid-js/web"
			);

			const Component = registry.resolve(component);
			if (!Component) {
				throw new Error(
					`[inertia/solid] Component "${component}" is not registered. ` +
						`Use createSolidAdapter({ components: { ${component}: ... } }).`,
				);
			}

			const fn = () => (Component as any)(props);
			const html = useAsync
				? await renderToStringAsync(fn)
				: renderToString(fn);
			return { html, head: [] };
		},
	};
}
