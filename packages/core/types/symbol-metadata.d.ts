/**
 * Type augmentation for `Symbol.metadata` (TC39 decorator metadata).
 *
 * Bun 1.3.10+ supports `Symbol.metadata` natively, but TypeScript's
 * lib may not include it when `experimentalDecorators: true` is set.
 *
 * This augmentation adds the type so the standard-decorator code compiles.
 */

declare global {
	interface SymbolConstructor {
		/** TC39 decorator metadata symbol (Bun 1.3.10+, TypeScript 5.2+). */
		readonly metadata: unique symbol;
	}
}

export {};