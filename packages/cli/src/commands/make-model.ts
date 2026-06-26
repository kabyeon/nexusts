/**
 * `nx make:model <Name>` — generate a model (table schema).
 *
 * Supports three ORMs via `nx.config.ts`'s `orm` field:
 *   - drizzle  → Drizzle table definition (dialect-aware)
 *   - prisma   → schema.prisma block + typed repository
 *   - kysely   → table interface + typed repository
 *
 * For Drizzle, the `--dialect` flag selects the right import path and
 * column types: postgres | mysql | sqlite | bun-sqlite | d1. Default
 * is `bun-sqlite` (the typical Bun + local-dev setup).
 *
 * Columns are read from the optional `--columns` flag as a comma-separated
 * list of `name:type` pairs:
 *
 *   nx make:model User --columns "name:text,email:text,bio:text"
 *   nx make:model Post --orm drizzle --dialect postgres --columns "title:text,body:text,published:boolean"
 */

import { resolve } from "node:path";
import type { Command, CommandContext } from "../core/index.js";
import {
	flagList,
	logger,
	nameVariants,
	render,
	writeFile,
} from "../core/index.js";
import { templates } from "../templates/index.js";
import {
	mapDrizzleType,
	renderDrizzleDialect,
} from "../templates/model/drizzle-dialect.js";

export const makeModelCommand: Command = {
	name: "make:model",
	aliases: ["mmodel", "make-model"],
	summary: "Generate a model (table schema)",
	description:
		"Generates a model file under app/models/. The template is chosen from nx.config.ts's `orm` field (drizzle|prisma|kysely). For drizzle, use --dialect to pick the import path.",
	examples: [
		"nx make:model User",
		'nx make:model User --columns "name:text,email:text"',
		"nx make:model User --orm drizzle --dialect postgres",
		"nx make:model Post --orm drizzle --dialect postgres --columns 'title:text,body:text,published:boolean'",
	],
	flags: [
		{
			name: "columns",
			description: "Comma-separated `name:type` pairs (default: title:text)",
		},
		{
			name: "orm",
			description: "Override ORM driver (drizzle|prisma|kysely)",
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
			logger.error(
				"Usage: nx make:model <Name> [--columns name:type,...] [--dialect ...]",
			);
			return 1;
		}

		const orm = (ctx.flags.orm as string | undefined) ?? ctx.config.orm;
		if (orm !== "drizzle" && orm !== "prisma" && orm !== "kysely") {
			logger.error(
				`Unsupported ORM: ${orm}. Allowed: drizzle, prisma, kysely. Use --orm or set "orm" in nx.config.ts.`,
			);
			return 1;
		}

		const variants = nameVariants(name);
		const tableName = variants.pluralSnake;

		// Parse --columns. Default to a single `title:text` column.
		const colsFlag = flagList(ctx.flags, "columns");
		const columns = colsFlag.length > 0 ? colsFlag : ["title:text"];
		const columnLines = renderColumns(
			columns,
			orm,
			ctx.flags.dialect as string | undefined,
		);
		const prismaBlock = renderPrismaBlock(variants.pascal, columns);

		let code: string;
		if (orm === "drizzle") {
			const dialect =
				(ctx.flags.dialect as string | undefined) ??
				ctx.config.dialect ??
				"bun-sqlite";
			if (!isValidDialect(dialect)) {
				logger.error(
					`Unsupported drizzle dialect: ${dialect}. Allowed: postgres, mysql, sqlite, bun-sqlite, d1.`,
				);
				return 1;
			}
			code = renderDrizzleDialect(dialect);
			code = render(code, {
				name: variants.pascal,
				camel: variants.camel,
				kebab: variants.kebab,
				snake: variants.snake,
				tableName,
				columns: columnLines,
				prismaBlock,
			});
		} else {
			const tpl = templates.model[orm as "prisma" | "kysely"];
			code = render(tpl, {
				name: variants.pascal,
				camel: variants.camel,
				kebab: variants.kebab,
				snake: variants.snake,
				tableName,
				columns: columnLines,
				prismaBlock,
			});
		}

		const out = resolve(
			ctx.cwd,
			ctx.config.paths.models,
			`${variants.kebab}.model.ts`,
		);

		writeFile(out, code);
		logger.success(`created ${out}`);
		logger.finger(
			`run \`nx make:migration create_${tableName}_table\` to scaffold a migration.`,
		);
		if (orm === "drizzle") {
			logger.finger(
				`run \`nx migrate\` to apply pending migrations to the database.`,
			);
		}
		return 0;
	},
};

function isValidDialect(
	d: string,
): d is "postgres" | "mysql" | "sqlite" | "bun-sqlite" | "d1" {
	return ["postgres", "mysql", "sqlite", "bun-sqlite", "d1"].includes(d);
}

function renderColumns(
	cols: string[],
	orm: "drizzle" | "prisma" | "kysely",
	dialect: string | undefined,
): string {
	// `cols` may contain comma-separated entries (e.g. `--columns "a:text,b:int"`).
	const flat = cols
		.flatMap((c) => c.split(","))
		.map((c) => c.trim())
		.filter(Boolean);
	return flat
		.map((col) => {
			const [colName, colType = "text"] = col.split(":");
			const tsName = toCamel(colName);
			switch (orm) {
				case "drizzle": {
					const d = (dialect ?? "bun-sqlite") as
						| "postgres"
						| "mysql"
						| "sqlite"
						| "bun-sqlite"
						| "d1";
					const helper = mapDrizzleType(d, colType);
					return `  ${tsName}: ${helper}('${colName}'),`;
				}
				case "kysely": {
					const tsType = colType === "text" ? "string" : colType;
					return `  ${colName}: ${tsType},`;
				}
				default:
					return `  ${colName} ${colType},`;
			}
		})
		.join("\n");
}

function renderPrismaBlock(modelName: string, cols: string[]): string {
	const fieldLines = cols
		.map((c) => {
			const [name, type = "String"] = c.split(":");
			return `  ${name.padEnd(16)} ${capitalize(type)}`;
		})
		.join("\n");
	return ` * model ${modelName} {
 *   id          Int      @id @default(autoincrement())
${fieldLines
	.split("\n")
	.map((l) => ` *${l}`)
	.join("\n")}
 *   createdAt   DateTime @default(now())
 *   updatedAt   DateTime @updatedAt
 * }`;
}

function toCamel(s: string): string {
	return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export default makeModelCommand;
