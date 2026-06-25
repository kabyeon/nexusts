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
	if (target === null || target === undefined) {
		return `${String(key)}|__null__|${prop !== undefined ? String(prop) : ""}`;
	}
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
	// Do NOT fire an async import here — it creates a race condition where
	// `Reflect.decorate` becomes available during module evaluation,
	// changing how third-party decorator helpers (like Bun's __decorate)
	// apply decorators. The synchronous Map fallback handles everything.
}

/** Safely read metadata. Returns undefined when reflect-metadata is absent. */
export function safeGetMeta(key: any, target: any, prop?: any): any {
	ensureReflectMetadata();
	// Check fallback Map FIRST — metadata may have been stored there
	// during decorator execution before the async dynamic import of
	// reflect-metadata completed.
	const mapVal = fallbackStore.get(keyId(key, target, prop));
	if (mapVal !== undefined) return mapVal;
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
	// Fallback: check __nexus_meta__ on the class (shared across bundles)
	if (typeof target === "function") {
		const clsMeta = (target as any).__nexus_meta__;
		if (clsMeta && key in clsMeta) {
			const val = clsMeta[key];
			if (prop !== undefined && val && typeof val === "object") {
				return (val as any)[prop];
			}
			return val;
		}
	}
	return undefined;
}

/** Safely define metadata. Falls back to internal Map when reflect-metadata is absent. */
export function safeDefineMeta(key: any, value: any, target: any, prop?: any): void {
	ensureReflectMetadata();
	// ALWAYS store in the fallback Map first — guarantees the metadata
	// is available synchronously even if the async reflect-metadata
	// dynamic import hasn't completed yet.
	fallbackStore.set(keyId(key, target, prop), value);
	// Also store on __nexus_meta__ for cross-bundle consistency.
	// Every package that imports safe-reflect gets its OWN bundled
	// copy with its own fallbackStore Map. __nexus_meta__ is the only
	// shared storage across all bundles.
	if (typeof target === "function") {
		let meta = (target as any).__nexus_meta__;
		if (!meta) {
			meta = {};
			Object.defineProperty(target, "__nexus_meta__", {
				value: meta,
				writable: true,
				configurable: true,
				enumerable: false,
			});
		}
		if (prop !== undefined) {
			if (!meta[key]) meta[key] = {};
			meta[key][prop] = value;
		} else {
			meta[key] = value;
		}
	}
	// Also try Reflect if available (for consistency with code that
	// reads via Reflect directly).
	try {
		if (typeof Reflect.defineMetadata === "function") {
			if (prop !== undefined) {
				Reflect.defineMetadata(key, value, target, prop);
			} else {
				Reflect.defineMetadata(key, value, target);
			}
		}
	} catch {
		// reflect-metadata not loaded yet
	}
}

/** Safely check metadata existence. Returns false when reflect-metadata is absent. */
export function safeHasMeta(key: any, target: any): boolean {
	ensureReflectMetadata();
	// Check fallback Map FIRST — metadata may have been stored there
	// during decorator execution before the async dynamic import of
	// reflect-metadata completed.
	if (fallbackStore.has(keyId(key, target))) return true;
	try {
		if (typeof Reflect.hasMetadata === "function") {
			return Reflect.hasMetadata(key, target);
		}
	} catch {
		// reflect-metadata not loaded yet
	}
	return false;
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
