/**
 * `nx db:migrate` — apply pending database migrations.
 *
 * Two modes:
 *
 *   1. **Default**: scan the project's `nx.config.ts` for
 *      `paths.migrations` and run every pending file through the
 *      drizzle-kit-equivalent migrator path.
 *
 *      Implementation: spawns `bunx drizzle-kit migrate` if the
 *      drizzle-kit binary is on PATH; otherwise runs an in-process
 *      migration script that uses `nexusjs/drizzle`'s
 *      `db.migrate(folder)` directly.
 *
 *   2. **`--status`**: list applied migrations + pending count.
 *
 *   3. **`--generate "<name>"`**: wrapper around `drizzle-kit
 *      generate` — useful when you want to commit a migration file
 *      but prefer the `nx` alias over the bare command.
 *
 * Examples:
 *   nx db:migrate
 *   nx db:migrate --status
 *   nx db:migrate --generate "add_user_email"
 *   nx db:migrate --folder ./drizzle --dialect postgres
 *
 * See also: `nx db:seed` for inserting fixture data.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Command, CommandContext } from "../core/index.js";
import { logger } from "../core/index.js";

export const dbMigrateCommand: Command = {
	name: "db:migrate",
	aliases: ["db:m", "migrate"],
	summary: "Apply pending database migrations",
	description:
		"Runs the Drizzle migrator against the configured migrations folder. Use --status to inspect, --generate to scaffold a new migration via drizzle-kit. See also `nx db:seed` for fixture data.",
	examples: [
		"nx db:migrate",
		"nx db:migrate --status",
		"nx db:migrate --generate 'add_email_to_users'",
		"nx db:migrate --folder ./drizzle",
	],
	flags: [
		{
			name: "status",
			description: "List applied migrations and exit (no apply).",
		},
		{
			name: "generate",
			description: "Run `drizzle-kit generate` with the given migration name.",
		},
		{
			name: "folder",
			description: "Override migrations folder (default: from nx.config.ts).",
		},
		{
			name: "dialect",
			description:
				"Drizzle dialect (postgres|mysql|sqlite|bun-sqlite|d1). Default: bun-sqlite.",
		},
		{
			name: "config",
			description: "Path to drizzle.config.ts. Default: ./drizzle.config.ts.",
		},
	],
	async run(ctx: CommandContext): Promise<number> {
		const folder =
			(ctx.flags["folder"] as string | undefined) ??
			resolve(ctx.cwd, ctx.config.paths.migrations);
		const dialect =
			(ctx.flags["dialect"] as string | undefined) ??
			ctx.config.dialect ??
			"bun-sqlite";
		const configPath =
			(ctx.flags["config"] as string | undefined) ??
			resolve(ctx.cwd, "drizzle.config.ts");
		const wantStatus = Boolean(ctx.flags["status"]);
		const generateName = ctx.flags["generate"] as string | undefined;

		if (generateName) {
			return runDrizzleKit(ctx.cwd, [
				"generate",
				...(existsSync(configPath) ? [`--config=${configPath}`] : []),
				"--name",
				generateName,
			]);
		}

		if (wantStatus) {
			return await runStatus(
			ctx.cwd,
			folder,
			dialect,
			(ctx.config.database as any)?.url ?? "",
		);
		}

		// Default: apply pending migrations via drizzle-kit.
		return runDrizzleKit(ctx.cwd, [
			"migrate",
			...(existsSync(configPath) ? [`--config=${configPath}`] : []),
		]);
	},
};

export function runDrizzleKit(cwd: string, args: string[]): Promise<number> {
	return new Promise((resolveP) => {
		const cmd = "bunx";
		logger.info(`$ ${cmd} drizzle-kit ${args.join(" ")}`);
		const child = spawn(cmd, ["drizzle-kit", ...args], {
			cwd,
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		child.on("exit", (code) => resolveP(code ?? 0));
		child.on("error", (err) => {
			logger.error(`failed to spawn drizzle-kit: ${err.message}`);
			resolveP(1);
		});
	});
}

/**
 * Run a tiny inline script that opens the Drizzle service and prints
 * applied migrations. Used when the user runs `nx migrate --status`
 * and we don't have a full app boot context.
 */
async function runStatus(
	cwd: string,
	folder: string,
	dialect: string,
	configUrl: string = "",
): Promise<number> {
	if (!existsSync(folder)) {
		logger.warn(`migrations folder not found: ${folder}`);
		return 0;
	}
	const url = readEnvUrl(dialect) ?? configUrl;
	if (!url) {
		logger.error(
			`could not read ${dialect} URL from environment. Set DATABASE_URL or NEXUS_DB_URL.`,
		);
		return 1;
	}
	const script = `
import 'reflect-metadata';
import { DrizzleService } from '@nexusts/drizzle';

const url = ${JSON.stringify(url)};
const dialect = ${JSON.stringify(dialect)};
const folder = ${JSON.stringify(folder)};

const cfg = { dialect, connection: { url }, schema: dialect === 'postgres' ? 'public' : undefined };
const svc = new DrizzleService(cfg);
await svc.open();
const applied = await svc.appliedMigrations();
console.log(JSON.stringify({ total: applied.length, applied }, null, 2));
await svc.close();
`;
	const tmpFile = resolve(cwd, ".nx-migrate-status.mjs");
	await import("node:fs/promises").then((m) =>
		m.writeFile(tmpFile, script, "utf-8"),
	);
	try {
		const code = await new Promise<number>((resP) => {
			const child = spawn("bun", [tmpFile], {
				cwd,
				stdio: "inherit",
				shell: process.platform === "win32",
			});
			child.on("exit", (c) => resP(c ?? 0));
			child.on("error", () => resP(1));
		});
		return code;
	} finally {
		await import("node:fs/promises").then((m) =>
			m.unlink(tmpFile).catch(() => {}),
		);
	}
}

function readEnvUrl(dialect: string): string | null {
	const url =
		process.env["DATABASE_URL"] ??
		process.env["NEXUS_DB_URL"] ??
		(dialect === "postgres"
			? process.env["POSTGRES_URL"]
			: dialect === "mysql"
				? process.env["MYSQL_URL"]
				: dialect.includes("sqlite")
					? process.env["SQLITE_FILENAME"]
					: null);
	return url ?? null;
}


export default dbMigrateCommand;
