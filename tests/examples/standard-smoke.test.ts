/**
 * Smoke test for standard decorator mode (TC39 stage-3).
 *
 * This test verifies that NexusTS works correctly WITHOUT
 * `experimentalDecorators` and WITHOUT `reflect-metadata`, using
 * Bun's native TC39 standard decorator mode.
 *
 * It creates a per-example tsconfig with `experimentalDecorators: false`
 * and boots only examples that are known to work in standard mode.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
	mkdir,
	readdir,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

// ── Config ──

const EXAMPLES_DIR = path.resolve(__dirname, "../../examples");
const START_PORT = 15000;
const BOOT_TIMEOUT_MS = 8_000;
const SHUTDOWN_GRACE_MS = 1_500;

// Standard decorator tsconfig — NO experimentalDecorators.
// Bun will use its default TC39 stage-3 decorator mode.
const STANDARD_TSCONFIG = {
	extends: "../../tsconfig.json",
	compilerOptions: {
		target: "ES2022",
		module: "ESNext",
		moduleResolution: "Bundler",
		lib: ["ES2022", "DOM"],
		experimentalDecorators: false,
		useDefineForClassFields: true,
		esModuleInterop: true,
		skipLibCheck: true,
		noEmit: true,
		jsx: "react-jsx",
		types: ["bun-types"],
		baseUrl: ".",
		paths: {
			"@nexusts/core/*": ["../../packages/core/src/*"],
			"@nexusts/*": ["../../packages/*/src/index.ts"],
			"@nexusts/core": ["../../packages/core/src/index.ts"],
		},
	},
	include: [
		"./**/*.ts",
		"./*.tsx",
		"./**/*.tsx",
		"../../packages/*/src/**/*.ts",
	],
};

// ── Examples known to work in standard decorator mode ──
// These examples use field injection and ctx.req.* methods, no @Body/@Param.
const STANDARD_MODE_EXAMPLES = [
	"35-standard-decorators",
	"01-basic-mvc",
	"02-routing-styles",
	"08-scheduler",
	"11-sse",
	"12-rate-limit",
	"25-static-files",
	"26-health",
	// Add more examples as they are verified to work in standard mode
];

// ── Test infrastructure (reuses smoke test patterns) ──

interface ExampleSpec {
	name: string;
	mainTs: string;
}

const createdConfigs: string[] = [];
const createdSymlinks: string[] = [];

async function listStandardExamples(): Promise<ExampleSpec[]> {
	const out: ExampleSpec[] = [];
	for (const name of STANDARD_MODE_EXAMPLES) {
		const mainTs = path.join(EXAMPLES_DIR, name, "main.ts");
		if (existsSync(mainTs)) {
			out.push({ name, mainTs });
		}
	}
	return out;
}

async function ensureExampleTsconfig(exampleDir: string): Promise<void> {
	const target = path.join(exampleDir, "tsconfig.json");
	if (!existsSync(target)) {
		await writeFile(
			target,
			JSON.stringify(STANDARD_TSCONFIG, null, 2),
		);
		createdConfigs.push(target);
	}
}

async function ensureExampleNodeModules(exampleDir: string): Promise<void> {
	const nmDir = path.join(exampleDir, "node_modules");
	if (!existsSync(nmDir)) {
		await mkdir(nmDir, { recursive: true });
		createdSymlinks.push(nmDir);
	}
	const bunDir = path.resolve(
		__dirname,
		"../../node_modules/.bun",
	);
	try {
		const entries = await readdir(bunDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory() || !entry.name.startsWith(".")) continue;
			const innerNm = path.join(bunDir, entry.name, "node_modules");
			try {
				const innerEntries = await readdir(innerNm, {
					withFileTypes: true,
				});
				for (const inner of innerEntries) {
					if (!inner.isDirectory() && !inner.isSymbolicLink()) continue;
					if (inner.name.startsWith(".")) continue;
					const target = path.join(innerNm, inner.name);
					const link = path.join(nmDir, inner.name);
					if (existsSync(link)) continue;
					await symlink(target, link);
					createdSymlinks.push(link);
				}
			} catch {
				/* skip */
			}
		}
	} catch {
		/* root .bun/ might not exist */
	}
}

interface BootResult {
	ok: boolean;
	stdout: string;
	stderr: string;
	reason: "ready" | "crash" | "timeout";
}

async function bootExample(
	spec: ExampleSpec,
	port: number,
): Promise<BootResult> {
	return await new Promise((resolve) => {
		const proc: ChildProcess = spawn("bun", ["run", spec.mainTs], {
			cwd: path.dirname(spec.mainTs),
			env: {
				...process.env,
				NODE_ENV: "test",
				PORT: String(port),
				NO_COLOR: "1",
			},
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let settled = false;
		let bootTimer: NodeJS.Timeout | undefined;

		const finish = (result: BootResult) => {
			if (settled) return;
			settled = true;
			if (bootTimer) clearTimeout(bootTimer);
			if (!proc.killed) {
				proc.kill("SIGTERM");
				setTimeout(() => {
					if (!proc.killed) proc.kill("SIGKILL");
				}, SHUTDOWN_GRACE_MS);
			}
			resolve(result);
		};

		proc.stdout?.on("data", (chunk) => {
			stdout += chunk.toString();
			if (
				/(?:listening|server|started|ready|on port|\bon http)/i.test(
					stdout,
				)
			) {
				finish({
					ok: true,
					stdout,
					stderr,
					reason: "ready",
				});
			}
		});

		proc.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		proc.on("error", (err) => {
			stderr += `[spawn error] ${err.message}\n`;
			finish({ ok: false, stdout, stderr, reason: "crash" });
		});

		proc.on("exit", (code, signal) => {
			if (!settled) {
				finish({
					ok: false,
					stdout,
					stderr,
					reason: signal === "SIGTERM" ? "timeout" : "crash",
				});
			}
		});

		bootTimer = setTimeout(() => {
			finish({ ok: false, stdout, stderr, reason: "timeout" });
		}, BOOT_TIMEOUT_MS);
	});
}

// ── Tests ──

const allExamples = await listStandardExamples();

describe("standard decorator mode", () => {
	beforeAll(async () => {
		for (const spec of allExamples) {
			await ensureExampleTsconfig(path.dirname(spec.mainTs));
			await ensureExampleNodeModules(path.dirname(spec.mainTs));
		}
	});

	afterAll(async () => {
		await Promise.all(
			createdConfigs.map((file) => rm(file, { force: true })),
		);
		for (const sym of createdSymlinks) {
			await rm(sym, { recursive: true, force: true });
		}
	});

	it("discovers at least 2 standard-mode examples", () => {
		expect(allExamples.length).toBeGreaterThanOrEqual(2);
	});

	for (let i = 0; i < allExamples.length; i++) {
		const spec = allExamples[i];
		const port = START_PORT + i;

		it(`[standard] ${spec.name} starts and listens`, async () => {
			const result = await bootExample(spec, port);
			if (!result.ok) {
				const tail = (result.stderr || result.stdout)
					.split("\n")
					.slice(-15)
					.join("\n");
				throw new Error(
					`${spec.name} did not boot (${result.reason}):\n${tail}`,
				);
			}
		});
	}
});
