/**
 * View engine abstraction.
 *
 * The framework can render templates using any installed engine. Built-in
 * adapters ship for Rendu (PHP-style templates) and Edge (Adonis-style).
 *
 * The default adapter is Rendu because it works on every runtime —
 * Cloudflare Workers, Bun, Deno, and Node — without extra dependencies.
 */
import { RenduAdapter } from "./rendu.js";
import type { ViewAdapter, ViewContext } from "./types.js";

export type { ViewAdapter, ViewContext, ViewOptions } from "./types.js";

/**
 * Directories to search when the `view` value looks like a file path
 * (e.g. `"about.html"` or `"emails/welcome.html"`). Configured via
 * `Application.setViewPaths()`. Empty by default — pass an empty
 * array (the default) to require inline templates, or set the paths
 * once at boot to enable file-based views.
 */
let viewPaths: string[] = [];

/** Replace the current view path list. */
export function setViewPaths(paths: string[]): void {
	viewPaths = paths.map((p) => (p.endsWith("/") || p.endsWith("\\") ? p : `${p}/`));
}

/** Return a copy of the current view path list. */
export function getViewPaths(): string[] {
	return [...viewPaths];
}

/** File extensions that indicate the `view` value is a file path. */
const VIEW_FILE_EXTS = [".html", ".edge", ".rendu", ".eta"] as const;

/**
 * Is the given string a file path (i.e. has one of the known view
 * file extensions)? Used to decide whether `renderView` should
 * load the file from disk or treat the string as inline source.
 */
function isViewFilePath(name: string): boolean {
	const lower = name.toLowerCase();
	return VIEW_FILE_EXTS.some((ext) => lower.endsWith(ext));
}

/**
 * Render a view using the default (Rendu) adapter.
 *
 * - If `template` ends in a known view file extension (`.html`,
 *   `.edge`, `.rendu`, `.eta`) and `viewPaths` is non-empty, the
 *   file is loaded from the first matching directory and used
 *   as the template source.
 * - Otherwise `template` is treated as inline template source.
 *
 * Override the adapter with `app.setViewAdapter()`.
 */
export async function renderView(
	template: string,
	data: Record<string, any>,
	context?: ViewContext,
): Promise<string> {
	let source = template;
	if (isViewFilePath(template) && viewPaths.length > 0) {
		const loaded = await loadTemplate(viewPaths, template);
		if (loaded === null) {
			throw new Error(
				`[nexus] View file not found: "${template}" (searched: ${viewPaths.join(", ")})`,
			);
		}
		source = loaded;
	}
	const adapter = new RenduAdapter();
	return adapter.render(source, data, context);
}

/**
 * Try a sequence of directories to locate a template file. Returns the
 * first match. This is intentionally filesystem-based and only used on
 * serverful runtimes; edge adapters should pass inline strings instead.
 */
export async function loadTemplate(
	paths: string[],
	name: string,
): Promise<string | null> {
	for (const dir of paths) {
		const full = joinPath(dir, name);
		try {
			const file = await readFile(full);
			if (file !== null) return file;
		} catch {
			// continue
		}
	}
	return null;
}

/**
 * Path join that works on both POSIX and Windows. Node/Bun provide path,
 * but Cloudflare Workers do not, so we re-implement minimally.
 */
function joinPath(dir: string, name: string): string {
	if (!dir.endsWith("/") && !dir.endsWith("\\")) return `${dir}/${name}`;
	return `${dir}${name}`;
}

async function readFile(path: string): Promise<string | null> {
	// Node/Bun.
	if (typeof globalThis.Bun !== "undefined") {
		try {
			const file = (globalThis as any).Bun.file(path);
			if (await file.exists()) return file.text();
		} catch {
			// ignore
		}
	}
	// Node-style (also works in Bun).
	try {
		const fs = await import("node:fs/promises");
		return await fs.readFile(path, "utf8");
	} catch {
		return null;
	}
}
