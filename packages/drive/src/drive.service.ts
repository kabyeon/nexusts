/**
 * `DriveService` — public façade.
 *
 *   const drive = new DriveService({ driver: new LocalDriver({ root: '/data' }) });
 *   await drive.put('a.txt', 'hello');
 *   const body = await drive.get('a.txt');
 */
import { Inject, Injectable } from "@nexusts/core";
import { MemoryDriver } from "./drivers/memory.js";
import type {
	DriveConfig,
	FileContent,
	FileMetadata,
	ListOptions,
	ListResult,
	PutOptions,
	SignedUrlOptions,
} from "./types.js";

@Injectable()
export class DriveService {
	/** DI token. */
	static readonly TOKEN = Symbol.for("nexus:DriveService");

	/** Drive configuration — injected by DI container. */
	@Inject("DRIVE_CONFIG") declare private readonly config: DriveConfig;

	private _driver!: import("./types.js").StorageDriver;
	private _signedUrlBuilder!: (key: string, opts?: SignedUrlOptions) => Promise<string>;
	defaultVisibility: NonNullable<DriveConfig["defaultVisibility"]> = "private";

	constructor(directConfig?: DriveConfig) {
		// Support direct instantiation (non-DI): store config immediately.
		// When using DI, @Inject("DRIVE_CONFIG") sets this.config after construction.
		if (directConfig !== undefined) {
			(this as any).config = directConfig;
		}
	}

	/** Ensure driver and builder are initialized from config. */
	private ensureInit(): void {
		if (this._driver) return;
		const cfg = this.config ?? {};
		this._driver = cfg.driver ?? new MemoryDriver();
		this.defaultVisibility = cfg.defaultVisibility ?? "private";
		this._signedUrlBuilder =
			cfg.signedUrlBuilder ??
			(async (key: string, opts?: SignedUrlOptions) =>
				this._driver.getSignedUrl(key, opts));
	}

	/** Direct access to the underlying driver (for advanced use). */
	get driver(): import("./types.js").StorageDriver {
		this.ensureInit();
		return this._driver;
	}

	async put(key: string, body: FileContent, opts?: PutOptions): Promise<void> {
		this.ensureInit();
		return this._driver.put(key, body, opts);
	}

	async get(key: string): Promise<Buffer> {
		this.ensureInit();
		return this._driver.get(key);
	}

	async delete(key: string): Promise<boolean> {
		this.ensureInit();
		return this._driver.delete(key);
	}

	async exists(key: string): Promise<boolean> {
		this.ensureInit();
		return this._driver.exists(key);
	}

	async head(key: string): Promise<FileMetadata> {
		this.ensureInit();
		return this._driver.head(key);
	}

	async list(opts?: ListOptions): Promise<ListResult> {
		this.ensureInit();
		return this._driver.list(opts);
	}

	async getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string> {
		this.ensureInit();
		return this._signedUrlBuilder(key, opts);
	}

	async copy(src: string, dest: string): Promise<void> {
		this.ensureInit();
		return this._driver.copy(src, dest);
	}

	async move(src: string, dest: string): Promise<void> {
		this.ensureInit();
		return this._driver.move(src, dest);
	}
}
