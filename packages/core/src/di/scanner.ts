/**
 * Module scanner.
 *
 * Reads the @Module({...}) metadata and recursively registers all
 * providers/controllers from imports, registering exports into the
 * parent container so cross-module injection works.
 */
import { METADATA_KEY } from "../constants.js";
import type { ApplicationContainer, DIContainer } from "./container.js";
import type { ModuleOptions, Provider, Type } from "./tokens.js";

interface ScanResult {
	/** Controllers registered by this module. */
	controllers: Type[];
	/** Providers registered locally (classes + non-class providers). */
	providers: Provider[];
	/** Tokens exported by this module. */
	exports: any[];
	/** Container holding the module's locally-scoped providers. */
	container: DIContainer;
}

export class ModuleScanner {
	private scanned = new Map<Type<any>, ScanResult>();

	constructor(private root: ApplicationContainer) {}

	/**
	 * Scan a module tree starting from `rootModule`, registering all
	 * providers and controllers into the appropriate containers.
	 */
	scan(rootModule: Type<any>): { root: ScanResult; modules: ScanResult[] } {
		const rootResult = this.scanModule(rootModule, this.root);
		const all = [...this.scanned.values()];
		return { root: rootResult, modules: all };
	}

	/**
	 * Scan one module. Recurses into its `imports`, then registers its
	 * providers and controllers. Exports are exposed to the parent
	 * container.
	 */
	private scanModule(
		moduleClass: Type<any>,
		parentContainer: DIContainer,
	): ScanResult {
		if (this.scanned.has(moduleClass)) {
			return this.scanned.get(moduleClass)!;
		}

		const options = this.readModuleOptions(moduleClass);
		const container = parentContainer.createChild();
		this.root.registerModule(moduleClass, container);

		// Pre-fill the slot to break import cycles when modules reference each other.
		const placeholder: ScanResult = {
			controllers: [],
			providers: [],
			exports: [],
			container,
		};
		this.scanned.set(moduleClass, placeholder);

		// Recurse into imports first so dependent tokens exist.
		for (const imported of options.imports ?? []) {
			const importedResult = this.scanModule(imported, parentContainer);
			// Expose imports' exports to the parent's container so the importing
			// module can resolve them.
			for (const exp of importedResult.exports) {
				if (!parentContainer.has(exp)) {
					// Re-export by creating a passthrough provider that resolves from
					// the imported module's container.
					parentContainer.register({
						provide: exp,
						useFactory: () => importedResult.container.resolve(exp),
					});
				}
			}
		}

		// Register providers (and controllers as providers for DI).
		const providers = [
			...(options.providers ?? []),
			...(options.controllers ?? []),
		];
		container.register(providers);

		// Expose declared exports from this module's container to the parent.
		for (const exp of options.exports ?? []) {
			if (!parentContainer.has(exp)) {
				parentContainer.register({
					provide: exp,
					useFactory: () => container.resolve(exp),
				});
			}
		}

		const result: ScanResult = {
			controllers: options.controllers ?? [],
			providers: options.providers ?? [],
			exports: options.exports ?? [],
			container,
		};
		this.scanned.set(moduleClass, result);
		return result;
	}

	private readModuleOptions(moduleClass: Type<any>): ModuleOptions {
		const meta = Reflect.getMetadata(METADATA_KEY.MODULE, moduleClass) as
			| ModuleOptions
			| undefined;
		if (!meta) {
			throw new Error(
				`Class "${moduleClass.name}" is missing the @Module() decorator.`,
			);
		}
		return meta;
	}

	/** Get a previously-scanned module's result (debug aid). */
	get(moduleClass: Type<any>): ScanResult | undefined {
		return this.scanned.get(moduleClass);
	}
}
