/**
 * `UploadService` — parses `multipart/form-data` requests and exposes
 * the parsed files to controller methods via decorators.
 */
import { Inject, Injectable } from "@nexusts/core";
import {
	UPLOAD_STORAGE_KEY,
	UploadError,
	type UploadConfig,
	type UploadedFile,
} from "./types.js";

interface ParsedFileEntry {
	name: string;
	filename?: string;
	type?: string;
	size?: number;
	arrayBuffer(): Promise<ArrayBuffer>;
}

type ParsedBodyValue = string | ParsedFileEntry | Array<string | ParsedFileEntry> | undefined;

@Injectable()
export class UploadService {
	static readonly TOKEN = Symbol.for("nexus:UploadService");

	@Inject("UPLOAD_CONFIG") declare private _config: UploadConfig;
	#driveResolver: ((token: string) => any) | null = null;
	private _cfg: Required<UploadConfig> | null = null;

	private get config(): Required<UploadConfig> {
		if (!this._cfg) {
			const c = this._config ?? {};
			this._cfg = {
				maxFileSize: c.maxFileSize ?? 10 * 1024 * 1024,
				maxFiles: c.maxFiles ?? 5,
				allowedMimeTypes: c.allowedMimeTypes ?? ["*"],
				storage: (c.storage as "memory") ?? "memory",
				driveToken: c.driveToken ?? "",
				drivePrefix: c.drivePrefix ?? "",
				preserveFilename: c.preserveFilename ?? false,
			};
		}
		return this._cfg;
	}

	bindDriveResolver(fn: (token: string) => any): void {
		this.#driveResolver = fn;
	}

	getConfig(): Required<UploadConfig> {
		return { ...this.config };
	}

	async parseAndStore(c: any, fields: Array<{ fieldName: string; maxFiles: number; required: boolean }>): Promise<void> {
		const cfg = this.config;
		const body = await this.#parseBody(c);
		const stored: Record<string, UploadedFile | UploadedFile[]> = {};

		for (const spec of fields) {
			const value = body[spec.fieldName];
			const files = this.#extractFiles(value);
			if (files.length === 0) {
				if (spec.required) throw new UploadError("MISSING_FIELD", spec.fieldName, `Missing required field "${spec.fieldName}".`);
				continue;
			}
			if (files.length > spec.maxFiles) throw new UploadError("TOO_MANY_FILES", spec.fieldName, `Field "${spec.fieldName}" accepts at most ${spec.maxFiles} files (got ${files.length}).`);
			for (const f of files) this.#validate(f, spec.fieldName);
			stored[spec.fieldName] = files.length === 1 ? files[0]! : files;
		}
		c.set(UPLOAD_STORAGE_KEY, stored);
		if (cfg.driveToken && this.#driveResolver) {
			const drive = this.#driveResolver(cfg.driveToken);
			if (drive?.put) {
				for (const entry of Object.values(stored)) {
					const list = Array.isArray(entry) ? entry : [entry];
					for (const file of list) {
						const filename = cfg.preserveFilename ? file.filename : this.#newFilename(file);
						await drive.put(`${cfg.drivePrefix}/${filename}`, file.buffer, { contentType: file.contentType });
						(file as any).storedKey = `${cfg.drivePrefix}/${filename}`;
					}
				}
			}
		}
	}

	get(c: any, fieldName: string): UploadedFile | undefined {
		const stored: Record<string, UploadedFile | UploadedFile[]> | undefined = c.get(UPLOAD_STORAGE_KEY);
		if (!stored) return undefined;
		const v = stored[fieldName];
		return Array.isArray(v) ? v[0] : v;
	}

	getAll(c: any, fieldName: string): UploadedFile[] {
		const stored: Record<string, UploadedFile | UploadedFile[]> | undefined = c.get(UPLOAD_STORAGE_KEY);
		if (!stored) return [];
		const v = stored[fieldName];
		if (Array.isArray(v)) return v;
		if (v) return [v];
		return [];
	}

	async #parseBody(c: any): Promise<Record<string, ParsedBodyValue>> {
		const req = c.req?.raw ?? c.req;
		const ct = (req.headers?.get?.("content-type") ?? "") as string;
		if (!ct.startsWith("multipart/form-data")) return {};
		try {
			return (await c.req.parseBody({ all: true })) as Record<string, ParsedBodyValue>;
		} catch (err) {
			throw new UploadError("BAD_MULTIPART", "*", `Failed to parse multipart body: ${(err as Error).message}`);
		}
	}

	#extractFiles(value: ParsedBodyValue): UploadedFile[] {
		if (value === undefined || value === null) return [];
		const list = Array.isArray(value) ? value : [value];
		return list
			.filter((v): v is ParsedFileEntry => typeof v === "object" && typeof (v as any).arrayBuffer === "function")
			.map((file) => ({
				fieldName: file.name,
				filename: (file as any).filename ?? file.name ?? "upload",
				contentType: file.type ?? "application/octet-stream",
				encoding: "7bit",
				buffer: Buffer.alloc(0),
				size: file.size ?? 0,
			}));
	}

	#validate(file: UploadedFile, fieldName: string): void {
		if (file.size > this.config.maxFileSize) throw new UploadError("FILE_TOO_LARGE", fieldName, `File "${file.filename}" is ${file.size} bytes; max is ${this.config.maxFileSize}.`);
		if (!this.#mimeAllowed(file.contentType)) throw new UploadError("MIME_NOT_ALLOWED", fieldName, `File "${file.filename}" has type "${file.contentType}"; not in the allow list.`);
	}

	#mimeAllowed(mime: string): boolean {
		for (const pat of this.config.allowedMimeTypes) {
			if (pat === "*") return true;
			if (pat === mime) return true;
			if (pat.endsWith("/*") && mime.startsWith(pat.slice(0, -2))) return true;
		}
		return false;
	}

	#newFilename(file: UploadedFile): string {
		const ext = file.filename.includes(".") ? file.filename.slice(file.filename.lastIndexOf(".")) : "";
		return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`;
	}
}
