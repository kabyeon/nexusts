/**
 * Ambient type declarations for the optional SSR peer dependencies.
 *
 * Each frontend (React, Vue, Svelte, Solid) is an OPTIONAL peer
 * dependency. The adapter files use dynamic `import(...)` so the
 * runtime is only resolved when the user has actually installed the
 * module. TypeScript however needs to know that those module names
 * are valid; this file declares minimal shapes that satisfy the
 * adapter signatures without forcing the user to install the
 * packages just to type-check.
 *
 * Users who install the real packages get full IntelliSense via the
 * packages' own `.d.ts` files (which override these ambient
 * declarations).
 */

// -------------------------------------------------------------------------
// React
// -------------------------------------------------------------------------
declare module "react" {
	export type ReactNode = unknown;
	export type ComponentType<P = any> = (props: P) => unknown;
	export function createElement(
		type: ComponentType | string,
		props?: Record<string, any> | null,
		...children: any[]
	): unknown;
	const React: {
		createElement: typeof createElement;
	};
	export default React;
}

declare module "react-dom/server" {
	export function renderToString(element: unknown): string;
	export function renderToStaticMarkup(element: unknown): string;
}

// -------------------------------------------------------------------------
// Vue
// -------------------------------------------------------------------------
declare module "vue" {
	export type Component = unknown;
	export function createSSRApp(root: any): {
		mount(target: any): any;
	};
	export function defineComponent(opts: any): any;
	export function h(type: any, props?: any, ...children: any[]): unknown;
	export const Fragment: unknown;
}

declare module "vue/server-renderer" {
	export function renderToString(app: any): Promise<string>;
	export function renderToStaticMarkup(app: any): Promise<string>;
}

// -------------------------------------------------------------------------
// Svelte (Svelte 4 + 5)
// -------------------------------------------------------------------------
declare module "svelte" {
	export type ComponentType = unknown;
}

declare module "svelte/server" {
	export function render(
		component: any,
		options: { props: Record<string, any> },
	): { body: string; head?: string };
}

// -------------------------------------------------------------------------
// Solid
// -------------------------------------------------------------------------
declare module "solid-js" {
	export type Component<P = any> = (props: P) => unknown;
	export function createComponent(type: any, props: any): unknown;
}

declare module "solid-js/web" {
	export function renderToString(fn: () => unknown): string;
	export function renderToStringAsync(fn: () => unknown): Promise<string>;
	export function ssr(
		fn: () => unknown,
		options?: { renderId?: string },
	): string;
}
