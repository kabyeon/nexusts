/**
 * Vue SSR adapter.
 *
 * Renders Inertia page components to HTML using Vue 3's official SSR
 * helpers (`@vue/server-renderer` + `vue`). Both packages are
 * OPTIONAL peer dependencies — the framework does not include them.
 *
 * Usage:
 *
 * ```ts
 * import { createSSRApp, h } from 'vue';
 * import { createVueAdapter } from 'nexusjs/view/inertia/ssr';
 * import { HomePage } from './pages/Home.vue';
 *
 * app.inertia.setSsrAdapter(createVueAdapter({
 *   components: { Home: HomePage },
 * }));
 * ```
 */
import type { SsrAdapter, SsrRenderResult } from "../types.js";
import { asRegistry, type ComponentRegistry } from "./registry.js";

export interface VueSsrOptions {
	components: ComponentRegistry | Record<string, any>;
}

export function createVueAdapter(options: VueSsrOptions): SsrAdapter {
	const registry = asRegistry(options.components);

	return {
		name: "vue",
		async render(
			component: string,
			props: Record<string, any>,
		): Promise<SsrRenderResult> {
			const [{ renderToString }, { createSSRApp, h }] = await Promise.all([
				import("vue/server-renderer"),
				import("vue"),
			]);

			const Component = registry.resolve(component);
			if (!Component) {
				throw new Error(
					`[inertia/vue] Component "${component}" is not registered. ` +
						`Use createVueAdapter({ components: { ${component}: ... } }) ` +
						`or registry.register('${component}', Component).`,
				);
			}

			const app = createSSRApp({
				render() {
					return h(Component, props);
				},
			});

			const html = await renderToString(app);
			return { html, head: [] };
		},
	};
}
