/**
 * Component registry shared by all SSR adapters.
 *
 * Each SSR adapter (React, Vue, Svelte, Solid) needs to map an Inertia
 * component name (e.g. `"Users/Index"`) to a real component that can
 * be rendered server-side. The registry centralizes that mapping so
 * the same configuration works across adapters and so users can
 * register components once and reuse them across requests.
 *
 * The registry is intentionally framework-agnostic: it doesn't care
 * what a "component" actually is, only that the SSR adapter knows how
 * to render it.
 */
export class ComponentRegistry {
	private readonly map = new Map<string, any>();

	/**
	 * Register a single component under `name`. Returns `this` so
	 * registrations can be chained.
	 */
	register(name: string, component: any): this {
		this.map.set(name, component);
		return this;
	}

	/** Register a batch of components at once. */
	registerAll(components: Record<string, any>): this {
		for (const [name, component] of Object.entries(components)) {
			this.map.set(name, component);
		}
		return this;
	}

	/** Look up a component by name. Returns `undefined` when missing. */
	resolve(name: string): any {
		return this.map.get(name);
	}

	/** Whether the registry has a binding for `name`. */
	has(name: string): boolean {
		return this.map.has(name);
	}

	/** Drop a binding. */
	unregister(name: string): boolean {
		return this.map.delete(name);
	}

	/** List of all registered component names (for diagnostics). */
	names(): string[] {
		return [...this.map.keys()];
	}

	/** Total number of registered components. */
	get size(): number {
		return this.map.size;
	}
}

/** Convenience factory. */
export function createRegistry(
	initial?: Record<string, any>,
): ComponentRegistry {
	const reg = new ComponentRegistry();
	if (initial) reg.registerAll(initial);
	return reg;
}

/**
 * Normalize the `components` option from any SSR adapter. Adapters
 * accept either an existing `ComponentRegistry` or a plain object
 * map; this helper unifies the two.
 */
export function asRegistry(
	input: ComponentRegistry | Record<string, any>,
): ComponentRegistry {
	return input instanceof ComponentRegistry ? input : createRegistry(input);
}
