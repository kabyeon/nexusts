/**
 * View engine type contracts.
 *
 * The framework treats the view system as pluggable: any adapter that
 * implements `ViewAdapter` can be installed via `app.setViewAdapter()`.
 */

/** Data passed to a view template. */
export interface ViewContext {
	/** Per-request data: URL, method, headers, cookies. */
	request?: {
		url?: string;
		method?: string;
		headers?: Record<string, string | string[]>;
		cookies?: Record<string, string>;
	};
	/** Response helpers that the template can call (setCookie, redirect...). */
	response?: {
		cookies?: Array<{
			name: string;
			value: string;
			options?: Record<string, any>;
		}>;
		redirect?: string;
		status?: number;
	};
	/** Application globals (flash messages, CSRF token, etc.). */
	globals?: Record<string, any>;
}

/** Render-time options that override defaults. */
export interface ViewOptions {
	/** Stream chunks instead of building one big string. */
	stream?: boolean;
	/** Disable HTML escaping (template responsible for safety). */
	raw?: boolean;
	/** Layout file to wrap the rendered view in. */
	layout?: string;
}

/**
 * Pluggable template engine adapter.
 *
 * Adapters must be runtime-agnostic; the bundled Rendu and Edge adapters
 * work on every target because they compile templates to render functions.
 */
export interface ViewAdapter {
	/** Engine name (for diagnostics). */
	readonly name: string;

	/** Render a template string with the given data. */
	render(
		template: string,
		data: Record<string, any>,
		context?: ViewContext,
		options?: ViewOptions,
	): Promise<string>;

	/** Compile a template once and return a render function. */
	compile?(
		template: string,
		options?: ViewOptions,
	): (data: Record<string, any>) => Promise<string>;
}
