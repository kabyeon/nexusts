/**
 * Build script — builds all 30 packages in the NexusTS monorepo.
 *
 * Each package has its own src/ and dist/. We use Bun's bundler
 * to produce per-package ESM bundles, then tsc to emit .d.ts files.
 *
 * Run with `bun run build` from the monorepo root.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PACKAGES_DIR = "packages";
const OUT_DIR = "dist";
const ENTRY = "src/index.ts";

console.log("[build] scanning packages/…");
const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name)
	.sort();

console.log(`[build] found ${packageDirs.length} packages: ${packageDirs.join(", ")}`);

let totalOutputs = 0;

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

	// Phase 1: bun.build()
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
		process.exit(1);
	}

	totalOutputs += result.outputs.length;

	// Phase 2: tsc --emitDeclarationOnly
	const tsc = spawnSync(
		"bun",
		[
			"x",
			"tsc",
			"--emitDeclarationOnly",
			"--declaration",
			"--target",
			"ES2022",
			"--module",
			"ESNext",
			"--moduleResolution",
			"Bundler",
			"--experimentalDecorators",
			"--emitDecoratorMetadata",
			"--useDefineForClassFields",
			"false",
			"--skipLibCheck",
			"--rootDir",
			srcDir,
			"--outDir",
			outDir,
			entry,
		],
		{ stdio: "pipe" },
	);
	if (tsc.status !== 0) {
		console.error(`[build] ${pkg}: tsc failed`);
		console.error(tsc.stderr?.toString());
		process.exit(tsc.status ?? 1);
	}
}

console.log(`[build] wrote ${totalOutputs} runtime files across ${packageDirs.length} packages`);
console.log("[build] done.");
