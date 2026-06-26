/**
 * `nx make:migration <Name>` — scaffold an EMPTY migration file (manual).
 *
 * Creates a template file under app/database/migrations/ that you
 * fill in by hand. Use this for one-off SQL edits or when you need
 * fine-grained control over the migration.
 *
 * For NORMAL schema changes, prefer `nx db:generate [name]` which
 * auto-generates migrations from your model files via drizzle-kit.
 *
 * Filename pattern: `YYYYMMDD_HHmmss_<snake>.sql` (or `.ts` for
 * Drizzle). The file is placed under the configured `paths.migrations`
 * directory.
 *
 * Drizzle dialect is chosen via `--dialect` (postgres | mysql | sqlite
 * | bun-sqlite | d1) or `nx.config.ts`'s `dialect` field. Default: bun-sqlite.
 *
 * Plain SQL migrations work for any dialect that uses Drizzle's
 * migrator (postgres-js / node-postgres / mysql2 / better-sqlite3).
 */

import { resolve } from "node:path";
import type { Command, CommandContext } from "../core/index.js";
import { logger, nameVariants, render, writeFile } from "../core/index.js";
import { templates } from "../templates/index.js";
import {
	mapDrizzleType,
	renderDrizzleDialect,
} from "../templates/model/drizzle-dialect.js";

export const makeMigrationCommand: Command = {
	name: "make:migration",
	aliases: ["mkm", "make-migration"],
	summary: "Generate a migration file",
	description:
		"Generates a migration under app/database/migrations/. The template is chosen from nx.config.ts's `orm` field. Use --dialect for Drizzle migrations.",
	examples: [
		"nx make:migration create_users_table",
		"nx make:migration add_email_to_users --orm drizzle --dialect postgres",
		"nx make:migration drop_old_index --orm none",
	],
	flags: [
		{
			name: "columns",
			description: "Comma-separated `name:type` pairs (default: title:text)",
		},
		{
			name: "orm",
			description: "Override ORM driver (drizzle|prisma|kysely|none)",
		},
		{
			name: "dialect",
			description:
				"Drizzle dialect (postgres|mysql|sqlite|bun-sqlite|d1). Default: bun-sqlite",
		},
	],
	async run(ctx: CommandContext): Promise<number> {
		const name = ctx.positional[0];
		if (!name) {
			logger.error("Usage: nx make:migration <Name> [--dialect ...]");
			return 1;
		}

		const orm = (ctx.flags.orm as string | undefined) ?? ctx.config.orm;
		const dialect =
			(ctx.flags.dialect as string | undefined) ??
			ctx.config.dialect ??
			"bun-sqlite";
		const isDrizzle = orm === "drizzle";
		const useGenericSql =
			orm === "none" || orm === "prisma" || orm === "kysely";

		const variants = nameVariants(name);
		const tableName = inferTableName(name);
		const colsFlag = ctx.flags.columns as string | string[] | undefined;
		const cols = parseColumns(colsFlag ?? "title:text");
		// For Drizzle: use the dialect-aware TS-style column rendering
		// (e.g. `text('email')`, `integer('age')`). For plain SQL: keep
		// the raw SQL syntax.
		const drizzleColumns = renderDrizzleColumns(cols, dialect);
		const sqlColumns = renderSqlColumns(cols, dialect);

		let code: string;
		let extension: string;
		if (isDrizzle) {
			if (!isValidDialect(dialect)) {
				logger.error(
					`Unsupported drizzle dialect: ${dialect}. Allowed: postgres, mysql, sqlite, bun-sqlite, d1.`,
				);
				return 1;
			}
			code = renderDrizzleDialect(dialect);
			code = render(code, {
				name: variants.pascal,
				snake: variants.snake,
				tableName,
				columns: drizzleColumns,
				timestamp: formatTimestamp(new Date()),
			});
			extension = "ts";
		} else if (useGenericSql) {
			const tpl = templates.migration.sql;
			code = render(tpl, {
				name: variants.pascal,
				snake: variants.snake,
				tableName,
				columns: sqlColumns,
				timestamp: formatTimestamp(new Date()),
			});
			extension = "sql";
		} else {
			logger.error(
				`Unsupported ORM for migration: ${orm}. Allowed: drizzle, none, prisma, kysely.`,
			);
			return 1;
		}

		const filename = `${formatTimestamp(new Date())}_${variants.snake}.${extension}`;
		const out = resolve(ctx.cwd, ctx.config.paths.migrations, filename);

		writeFile(out, code);
		logger.success(`created ${out}`);
		if (isDrizzle) {
			logger.finger(`run \`nx migrate\` to apply pending migrations.`);
		} else {
			logger.finger(`run \`bun nx db:generate & bun nx db:migrate\` or your migration tool.`);
		}
		return 0;
	},
};

function isValidDialect(
	d: string,
): d is "postgres" | "mysql" | "sqlite" | "bun-sqlite" | "d1" {
	return ["postgres", "mysql", "sqlite", "bun-sqlite", "d1"].includes(d);
}

function inferTableName(input: string): string {
	// `create_users_table` → `users`; `add_email_to_users` → `users`;
	// `Posts` → `posts`; fallback to the lowercased input.
	const m = /^create_(\w+)_table$/.exec(input);
	if (m) return m[1] ?? "";
	const m2 = /^(?:add|remove|drop|alter)_(\w+)_to_(\w+)$/.exec(input);
	if (m2) return m2[2] ?? "";
	return `${input.toLowerCase().replace(/s$/, "")}s`;
}

function parseColumns(input: string | string[]): Array<[string, string]> {
	const list = Array.isArray(input) ? input : input.split(",");
	return list
		.map((s) => s.trim())
		.filter(Boolean)
		.map((c) => {
			const [name, type = "text"] = c.split(":");
			return [name as string, type];
		});
}

function renderSqlColumns(
	cols: Array<[string, string]>,
	dialect: string,
): string {
	return cols
		.map(([name, type]) => {
			const sqlType = mapSqlType(type, dialect);
			const notNull = /NOT NULL/i.test(sqlType) ? "" : " NOT NULL";
			return `  ${name} ${sqlType}${notNull},`;
		})
		.join("\n");
}

function renderDrizzleColumns(
	cols: Array<[string, string]>,
	dialect: string,
): string {
	return cols
		.map(([name, type]) => {
			const helper = mapDrizzleType(dialect, type);
			return `  ${name}: ${helper}('${name}'),`;
		})
		.join("\n");
}

function mapSqlType(t: string, dialect: string): string {
	const type = t.toLowerCase();
	switch (type) {
		case "text":
		case "string":
		case "varchar":
			return dialect === "mysql" ? "VARCHAR(255)" : "TEXT";
		case "int":
		case "integer":
			return dialect === "postgres"
				? "INTEGER"
				: dialect === "mysql"
					? "INT"
					: "INTEGER";
		case "bigint":
		case "bigintunsigned":
			return dialect === "postgres" ? "BIGINT" : "BIGINT UNSIGNED";
		case "serial":
			return dialect === "postgres" ? "SERIAL" : "INTEGER AUTO_INCREMENT";
		case "bool":
		case "boolean":
			return dialect === "mysql" ? "BOOLEAN" : "BOOLEAN";
		case "float":
		case "number":
		case "real":
		case "double":
			return dialect === "mysql" ? "DOUBLE" : "REAL";
		case "datetime":
		case "timestamp":
			return dialect === "postgres"
				? "TIMESTAMP"
				: dialect === "mysql"
					? "DATETIME"
					: "INTEGER";
		case "date":
			return dialect === "mysql" ? "DATE" : "TEXT";
		case "json":
			return dialect === "postgres"
				? "JSONB"
				: dialect === "mysql"
					? "JSON"
					: "TEXT";
		case "jsonb":
			return dialect === "postgres" ? "JSONB" : "TEXT";
		default:
			return "TEXT";
	}
}

function formatTimestamp(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return (
		`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
		`_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
	);
}

export default makeMigrationCommand;
