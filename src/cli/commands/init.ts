/**
 * `nx init` — generate an `nx.config.ts` in the current directory.
 *
 * Interactive mode asks about routing style, view engine, ORM, and
 * database driver. Non-interactive mode uses `--style`, `--view`,
 * `--orm`, `--db` flags. Existing config is overwritten unless
 * `--merge` is passed.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Command, CommandContext } from "../core/index.js";
import { flagBool, logger, render, select, writeFile } from "../core/index.js";
import { templates } from "../templates/index.js";

export const initCommand: Command = {
	name: "init",
	aliases: ["i"],
	summary: "Initialize nx.config.ts",
	description:
		"Generates an nx.config.ts in the current directory. Interactive by default; pass flags to skip prompts.",
	examples: [
		"nx init",
		"nx init --style nest --view inertia --orm drizzle --db bun-sqlite",
		"nx init --no-interaction --style adonis --view rendu --orm none --db none",
	],
	flags: [
		{
			name: "style",
			description: "Routing style (nest|adonis|functional|mixed)",
		},
		{ name: "view", description: "View engine (rendu|edge|inertia|none)" },
		{ name: "orm", description: "ORM driver (drizzle|prisma|kysely|none)" },
		{
			name: "db",
			description:
				"Database driver (bun-sqlite|node-sqlite|libsql|postgres|mysql|none)",
		},
		{
			name: "frontend",
			description: "Inertia frontend (react|vue|svelte|solid)",
		},
		{ name: "no-ssr", description: "Disable Inertia SSR" },
		{ name: "no-interaction", description: "Disable interactive prompts" },
		{
			name: "merge",
			description: "Keep existing config; only fill missing fields",
		},
	],
	async run(ctx: CommandContext): Promise<number> {
		const interactive = !flagBool(ctx.flags, "no-interaction", false);
		const out = resolve(ctx.cwd, "nx.config.ts");

		if (existsSync(out) && !flagBool(ctx.flags, "merge", false)) {
			logger.warn(`Config already exists at ${out}. Pass --merge to keep it.`);
			return 1;
		}

		const routing =
			(ctx.flags["style"] as string | undefined) ??
			(await select(
				"Routing style",
				["nest", "adonis", "functional", "mixed"],
				{
					interactive,
				},
			));

		const view =
			(ctx.flags["view"] as string | undefined) ??
			(await select("View engine", ["inertia", "rendu", "edge", "none"], {
				interactive,
			}));

		const orm =
			(ctx.flags["orm"] as string | undefined) ??
			(await select("ORM driver", ["drizzle", "prisma", "kysely", "none"], {
				interactive,
			}));

		const db =
			(ctx.flags["db"] as string | undefined) ??
			(await select(
				"Database driver",
				["bun-sqlite", "node-sqlite", "libsql", "postgres", "mysql", "none"],
				{
					interactive,
				},
			));

		const frontend =
			(ctx.flags["frontend"] as string | undefined) ??
			(await select("Inertia frontend", ["react", "vue", "svelte", "solid"], {
				interactive,
				default: "react",
			}));

		const ssr = !flagBool(ctx.flags, "no-ssr", false);

		const code = render(templates.project["nx.config.ts"], {
			routing,
			view,
			orm,
			dbDriver: db,
			dbUrl: db === "bun-sqlite" || db === "node-sqlite" ? "app.db" : "",
			inertiaFrontend: frontend,
			inertiaSSR: ssr,
			inertiaVersion: "1.0.0",
		});

		writeFile(out, code);
		logger.success(`created ${out}`);
		logger.finger(`next: \`nx info\` to verify the resolved config.`);

		// If Drizzle was selected, also scaffold a `drizzle.config.ts`.
		if (orm === "drizzle") {
			const drizzleConfig = drizzleConfigFor(db, ctx.cwd);
			const drizzleOut = resolve(ctx.cwd, "drizzle.config.ts");
			if (existsSync(drizzleOut) && !flagBool(ctx.flags, "merge", false)) {
				logger.warn(
					`drizzle.config.ts already exists, skipping (use --merge to overwrite).`,
				);
			} else {
				writeFile(drizzleOut, drizzleConfig);
				logger.success(`created ${drizzleOut}`);
				logger.finger(
					`next: \`nx migrate --generate "init"\` to scaffold the first migration.`,
				);
			}
		}
		return 0;
	},
};

/** Build a `drizzle.config.ts` based on the chosen DB driver. */
function drizzleConfigFor(db: string, _cwd: string): string {
	const dialect = dbToDialect(db);
	if (dialect === null) {
		// Fallback: bun-sqlite
		return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/app/models/*.model.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./app.db',
  },
});
`;
	}
	const url =
		dialect === "sqlite"
			? `process.env.DATABASE_URL ?? 'file:./app.db'`
			: `process.env.DATABASE_URL ?? ''`;
	return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: '${dialect}',
  schema: './src/app/models/*.model.ts',
  out: './drizzle',
  dbCredentials: {
    url: ${url},
  },
  verbose: true,
  strict: true,
});
`;
}

function dbToDialect(db: string): string | null {
	switch (db) {
		case "bun-sqlite":
		case "node-sqlite":
		case "libsql":
			return "sqlite";
		case "postgres":
			return "postgresql";
		case "mysql":
			return "mysql";
		default:
			return null;
	}
}

export default initCommand;
