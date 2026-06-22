/**
 * `nx db:generate <name>` — generate a new migration file from schema changes.
 *
 * Wraps `drizzle-kit generate` with the project's config, so you
 * don't need to pass `--config` every time.
 *
 * Examples:
 *   nx db:generate add_users_table
 *   nx db:generate add_posts_table --dialect postgres
 *   nx db:generate --sql                       # raw SQL file (no drizzle-kit)
 *
 * See also:
 *   nx db:migrate       — apply pending migrations
 *   nx db:seed          — run database seeds
 *   nx make:migration   — scaffold an empty migration file
 */

import { resolve } from "node:path";
import type { Command, CommandContext } from "../core/index.js";
import { logger } from "../core/index.js";
import { runDrizzleKit } from "./db-migrate.js";

export const dbGenerateCommand: Command = {
	name: "db:generate",
	aliases: ["db:g", "db-generate", "generate-migration"],
	summary: "Generate a new migration from schema changes",
	description:
		"Generates a new migration file by running drizzle-kit generate with the project's config. " +
		"If no name is given, drizzle-kit auto-generates one. " +
		"Run after editing your schema files, then apply with `nx db:migrate`.",
	examples: [
		"nx db:generate",
		"nx db:generate add_users_table",
		"nx db:generate add_posts --dialect postgres",
	],
	flags: [
		{
			name: "dialect",
			description:
				"Database dialect (bun-sqlite|postgres|mysql|sqlite). Reads from nx.config.ts by default.",
		},
		{
			name: "sql",
			description: "Generate a raw SQL file instead of using drizzle-kit",
		},
	],
	async run(ctx: CommandContext): Promise<number> {
		const name = ctx.positional[0];
		const dialect =
			(ctx.flags["dialect"] as string | undefined) ?? ctx.config.dialect ?? "bun-sqlite";
		const isSql = ctx.flags["sql"] === true;

		if (isSql) {
			if (!name) {
				logger.error("Usage: nx db:generate <name> --sql");
				return 1;
			}
			logger.info(`Generating raw SQL migration: ${name} (dialect=${dialect})`);
			return runSqlTemplate(ctx.cwd, name, dialect);
		}

		// Resolve drizzle.config.ts path
		const configPath = resolve(ctx.cwd, "drizzle.config.ts");
		const args = ["generate", "--config", configPath];
		if (name) args.push("--name", name);

		logger.info(`Generating migration: ${name} (dialect=${dialect})`);
		return runDrizzleKit(ctx.cwd, args);
	},
};

/**
 * Generate a raw SQL migration file (without drizzle-kit).
 */
async function runSqlTemplate(
	cwd: string,
	name: string,
	dialect: string,
): Promise<number> {
	const { mkdirSync, writeFileSync } = await import("node:fs");
	const { join } = await import("node:path");
	const migrationsDir = join(cwd, "app", "database", "migrations");
	mkdirSync(migrationsDir, { recursive: true });

	const timestamp = Date.now();
	const filename = `${timestamp}_${name.replace(/[^a-z0-9_]+/g, "_")}.sql`;
	const filepath = join(migrationsDir, filename);

	const header = dialect === "postgres" || dialect === "mysql"
		? `-- Migration: ${name}\n-- Dialect: ${dialect}\n-- Generated: ${new Date().toISOString()}\n\n`
		: `-- Migration: ${name}\n-- Dialect: ${dialect} (SQLite)\n-- Generated: ${new Date().toISOString()}\n\n`;

	writeFileSync(filepath, header);
	logger.success(`created ${filepath}`);
	logger.info("Edit the SQL file, then run `nx db:migrate` to apply it.");
	return 0;
}

export default dbGenerateCommand;
