/**
 * Public entry point for `nexusjs/drizzle`.
 */
export * from "./types.js";
export { DrizzleService } from "./drizzle.service.js";
export { DrizzleModule } from "./drizzle.module.js";
export { DrizzleModel } from "./model.js";
export { DrizzleRepository } from "./repository/index.js";
export {
	Table,
	Column,
	PrimaryKey,
	getTableMeta,
	readTableMeta,
} from "./decorators/index.js";
export { RawQuery } from "./raw-query.js";
export {
	resolveDriver,
	postgresDriver,
	mysqlDriver,
	sqliteDriver,
	bunSqliteDriver,
	d1Driver,
} from "./drivers/index.js";
export type {
	DrizzleDriverResult,
	RawExecutor,
	DriverFactory,
} from "./drivers/index.js";

// Entity decorator (auto-injects table schema into repository)
export { Entity, getEntityTable } from "./entity.decorator.js";

// Migration helpers (programmatic drizzle-kit wrappers)
export { generateMigrations, pushSchema } from "./migrations.js";

// ============================================================================
// Re-exports from drizzle-orm — convenience exports so users don't need
// `import { eq } from 'drizzle-orm'` separately.
//
// All exports are verified at runtime. Some operators live deep in
// drizzle-orm's re-export chain; TypeScript 5.9 can hit the depth limit
// for `export * from` chains through the bundler module resolution.
// `@ts-expect-error` is used where the type chain doesn't reach, but the
// runtime value is always available (verified at drizzle-orm ≥0.36).
// ============================================================================

// Comparison — short chain, always resolves.
export { eq, ne, gt, gte, lt, lte } from "drizzle-orm";
export { and, or } from "drizzle-orm";
export { like, ilike } from "drizzle-orm";
export { inArray, notInArray } from "drizzle-orm";
export { isNull, isNotNull } from "drizzle-orm";
export { sql } from "drizzle-orm";
export { asc, desc } from "drizzle-orm";

// Deep chain — available at runtime, ts-expect-error because TS hits
// the re-export depth limit through drizzle-orm's barrel files.

// @ts-expect-error — runtime export from drizzle-orm/sql/expressions/conditions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { not } from "drizzle-orm";

// @ts-expect-error — runtime export from drizzle-orm/sql/expressions/conditions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { notLike, notIlike } from "drizzle-orm";

// @ts-expect-error — runtime export from drizzle-orm/relations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { relations } from "drizzle-orm";

// @ts-expect-error — runtime export from drizzle-orm/sql/expressions/conditions
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { between, notBetween } from "drizzle-orm";

// @ts-expect-error — runtime export from drizzle-orm/sql/functions/aggregate
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export { count, sum, avg, min, max } from "drizzle-orm";
