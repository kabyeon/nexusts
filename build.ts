/**
 * Build script — bundles all 30 framework packages + create-nexusts
 * using Bun.build (which handles TypeScript natively).
 *
 * Run with `bun run build` from the monorepo root.
 *
 * We skip the tsc --emitDeclarationOnly phase for now because of
 * workspace + cross-package type-resolution issues. Bun.build produces
 * plain JavaScript; type definitions can be added later via a per-
 * package build step or skipped entirely (consumers import the
 * @nexusts/* packages and get types from the published .d.ts files
 * once they exist).
 */
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const PACKAGES_DIR = "packages";
const ENTRY = "src/index.ts";

console.log("[build] scanning packages/…");
const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name)
	.sort();

console.log(`[build] found ${packageDirs.length} packages`);

let totalOutputs = 0;
let failed: string[] = [];

for (const pkg of packageDirs) {
	const srcDir = join(PACKAGES_DIR, pkg, "src");
	const entry = join(srcDir, "index.ts");
	if (!existsSync(entry)) {
		console.warn(`[build] skipping ${pkg}: no ${ENTRY}`);
		continue;
	}

	const outDir = join(PACKAGES_DIR, pkg, "dist");
	console.log(`[build] building @nexusts/${pkg}…`);
	if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	// Phase 1: bun.build() — produces runtime artifacts.
	//   Each package's entry becomes ./dist/index.js.
	const result = await Bun.build({
		entrypoints: [entry],
		outdir: outDir,
		target: "bun",
		format: "esm",
		splitting: false,
		minify: false,
		sourcemap: "linked",
		naming: "[dir]/[name].[ext]",
		loader: { ".ts": "ts" },
		packages: "external",
	});

	if (!result.success) {
		console.error(`[build] ${pkg}: bun.build() failed:`);
		for (const log of result.logs) console.error(log);
		failed.push(pkg);
		continue;
	}

	totalOutputs += result.outputs.length;
	console.log(`[build] ✓ @nexusts/${pkg} (${result.outputs.length} files)`);
}

console.log(`\n[build] done: ${totalOutputs} runtime files written`);
if (failed.length > 0) {
	console.error(`[build] FAILED for ${failed.length} packages: ${failed.join(", ")}`);
	process.exit(1);
}
