/**
 * Maps TypeScript primitive type names to their GraphQL scalar equivalents.
 *
 * Bun does not emit `design:returntype`/`design:paramtypes` metadata, so
 * full automatic type inference is unavailable. Users supply type strings
 * explicitly via `@Query("field", { returns: "String!" })` or
 * `@Arg("arg", "Int!")`. This utility normalises common TypeScript aliases
 * to their canonical GraphQL scalar names.
 */
const TS_TO_GQL: Record<string, string> = {
	string: "String",
	number: "Float",
	int: "Int",
	float: "Float",
	boolean: "Boolean",
	bool: "Boolean",
	id: "ID",
};

/**
 * Normalise a raw type string to its GraphQL scalar name.
 *
 * - Known TypeScript aliases are converted: `string` → `String`, etc.
 * - Unknown types (user-defined object types) are returned unchanged.
 * - Non-null (`!`) suffixes and list (`[...]`) wrappers are preserved.
 *
 * @example
 * normalizeGQLType("string")   // "String"
 * normalizeGQLType("string!")  // "String!"
 * normalizeGQLType("[int!]!")  // "[Int!]!"
 * normalizeGQLType("String!")  // "String!"  (already canonical — unchanged)
 * normalizeGQLType("User")     // "User"     (user-defined type — unchanged)
 */
export function normalizeGQLType(raw: string): string {
	const nonNull = raw.endsWith("!");
	const base = nonNull ? raw.slice(0, -1) : raw;
	const trimmed = base.trim();

	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		const inner = trimmed.slice(1, -1);
		return `[${normalizeGQLType(inner)}]${nonNull ? "!" : ""}`;
	}

	const mapped = TS_TO_GQL[trimmed.toLowerCase()];
	return (mapped ?? trimmed) + (nonNull ? "!" : "");
}
