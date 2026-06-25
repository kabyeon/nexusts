/**
 * Safe reflect wrappers — allows code to work with or without
 * `reflect-metadata` being loaded.
 *
 * In standard decorator mode, the framework uses `context.metadata`
 * (via `__nexus_meta__`) instead of `Reflect.getMetadata`. These
 * wrappers are only needed for the legacy fallback path.
 *
 * When reflect-metadata is NOT loaded, the legacy fallback uses an
 * internal Map. This is safe because the framework's standard-mode
 * code paths handle everything — the Map only serves legacy-mode
 * tests that explicitly import `reflect-metadata` upfront.
 *
 * The async `import("reflect-metadata")` is fired lazily but is NOT
 * relied upon for synchronous decorator execution. The Map handles
 * the first synchronous access; once the dynamic import completes,
 * subsequent calls use `Reflect.getMetadata`/`Reflect.defineMetadata`.
 */

/**
 * Synchronous fallback: a Map-based metadata store.
 * Used when reflect-metadata hasn't been loaded yet (dynamic import
 * is still in-flight).
 *
 * Key format: `${key}|${targetId}|${prop ?? ""}`
 */
const fallbackStore = new Map<string, any>();
let fallbackId = 0;

function keyId(key: any, target: any, prop?: any): string {
	const tid = (target as any)?.__fallback_id ?? (() => {
		const id = ++fallbackId;
		Object.defineProperty(target, "__fallback_id", {
			value: id,
			writable: false,
			configurable: false,
			enumerable: false,
		});
		return id;
	})();
	return `${String(key)}|${tid}|${prop !== undefined ? String(prop) : ""}`;
}

/**
 * Ensure reflect-metadata is loaded (lazy, at most once).
 * First call fires the dynamic import in the background.
 * Subsequent calls are no-ops.
 */
let _refMetaAttempted = false;
function ensureReflectMetadata(): void {
	if (_refMetaAttempted) return;
	_refMetaAttempted = true;
	if (typeof Reflect.getMetadata === "function") return; // already loaded
	// Fire async import — result is NOT awaited because decorators
	// run synchronously. The fallback Map handles the first access.
	import("reflect-metadata").catch(() => {
		/* not available — fallback Map stays active */
	});
}

/** Safely read metadata. Returns undefined when reflect-metadata is absent. */
export function safeGetMeta(key: any, target: any, prop?: any): any {
	ensureReflectMetadata();
	try {
		if (typeof Reflect.getMetadata === "function") {
			const val = prop !== undefined
				? Reflect.getMetadata(key, target, prop)
				: Reflect.getMetadata(key, target);
			if (val !== undefined) return val;
		}
	} catch {
		// reflect-metadata not loaded yet
	}
	return fallbackStore.get(keyId(key, target, prop));
}

/** Safely define metadata. Falls back to internal Map when reflect-metadata is absent. */
export function safeDefineMeta(key: any, value: any, target: any, prop?: any): void {
	ensureReflectMetadata();
	try {
		if (typeof Reflect.defineMetadata === "function") {
			if (prop !== undefined) {
				Reflect.defineMetadata(key, value, target, prop);
			} else {
				Reflect.defineMetadata(key, value, target);
			}
			return;
		}
	} catch {
		// reflect-metadata not loaded yet
	}
	fallbackStore.set(keyId(key, target, prop), value);
}

/** Safely check metadata existence. Returns false when reflect-metadata is absent. */
export function safeHasMeta(key: any, target: any): boolean {
	ensureReflectMetadata();
	try {
		if (typeof Reflect.hasMetadata === "function") {
			return Reflect.hasMetadata(key, target);
		}
	} catch {
		// reflect-metadata not loaded yet
	}
	return fallbackStore.has(keyId(key, target));
}

/**
 * Get design:paramtypes from a class constructor.
 * Returns empty array when reflect-metadata is absent.
 */
export function safeParamTypes(target: any): any[] {
	ensureReflectMetadata();
	try {
		if (typeof Reflect.getMetadata === "function") {
			return Reflect.getOwnMetadata("design:paramtypes", target) ?? [];
		}
	} catch {
		// reflect-metadata not loaded yet
	}
	return [];
}
