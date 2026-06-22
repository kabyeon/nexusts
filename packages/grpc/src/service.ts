/**
 * `GrpcService` — the main gRPC service.
 *
 * Owns the @grpc/grpc-js server, the loaded proto definition, and
 * the registered service implementations. The service is
 * registered in the DI container; the user calls `start()` to
 * bind the server to a port.
 *
 *   const grpc = container.resolve(GrpcService);
 *   await grpc.start();
 *   // ...
 *   await grpc.stop();
 *
 * The framework also exposes a `client<T>('ServiceName')` helper
 * for creating typed clients against the same (or a different)
 * server. Clients returned by this method are async — each method
 * returns a Promise.
 */

import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import {
	loadPackageDefinition,
	Server as GrpcServer,
	ServerCredentials,
	credentials as grpcCredentials,
} from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import {
	getGrpcMethodNames,
	getGrpcServiceName,
} from "./decorators.js";
import type { GrpcConfig } from "./types.js";
// logger is injected via the service in production; we use
// console here to avoid a circular dependency with @core/logger.

export const GRPC_SERVICE_TOKEN = Symbol.for("nexus:GrpcService");

export class GrpcService {
	readonly name = "grpc";
	#config: Required<Omit<GrpcConfig, "tls" | "onBound">> &
		Pick<GrpcConfig, "tls" | "onBound">;
	#server: GrpcServer | null = null;
	#bound = false;
	#proto: any = null;
	#instanceByService: Map<string, unknown> = new Map();
	#clientCtors: Map<string, new (url: string, creds: any) => any> = new Map();
	#resolve: (<T>(token: unknown) => T) | null = null;
	#host: string | null = null;
	#port: number | null = null;

	constructor(config: GrpcConfig) {
		this.#config = {
			protoPath: config.protoPath,
			package: config.package ?? "",
			services: config.services ?? [],
			port: config.port ?? 50051,
			host: config.host ?? "0.0.0.0",
			tls: config.tls,
			onBound: config.onBound,
		};
	}

	/** True if the server is currently bound to a port. */
	get isRunning(): boolean {
		return this.#bound;
	}

	/** The actual host the server bound to. `null` until start(). */
	get host(): string | null {
		return this.#host;
	}

	/** Inject a resolver function. Called by GrpcModule.forRoot(). */
	setResolver(resolve: <T>(token: unknown) => T): void {
		this.#resolve = resolve;
	}

	/** The actual port the server bound to. `null` until start(). */
	get port(): number | null {
		return this.#port;
	}

	/**
	 * Load the .proto file(s) and prepare the server.
	 * Idempotent — call once at boot, before `start()`.
	 */
	async prepare(resolve: <T>(token: unknown) => T): Promise<void> {
		// Load proto(s)
		const files = Array.isArray(this.#config.protoPath)
			? this.#config.protoPath
			: [this.#config.protoPath];
		for (const f of files) {
			if (!existsSync(f)) {
				throw new Error(
					`[grpc] proto file not found: ${f}. ` +
						`Resolve the path relative to your project root.`,
				);
			}
		}

		// loadPackageDefinition takes a single PackageDefinition. We
		// load each .proto separately and merge them into one
		// package tree.
		const merged: Record<string, unknown> = {};
		for (const f of files) {
			const def = protoLoader.loadSync(f, {
				keepCase: false,
				longs: String,
				enums: String,
				defaults: true,
				oneofs: true,
			});
			const loaded = loadPackageDefinition(def);
			Object.assign(merged, loaded);
		}
		this.#proto = merged;

		// Build the server and register services
		this.#server = new GrpcServer();
		for (const ServiceImpl of this.#config.services) {
			const svcName = getGrpcServiceName(ServiceImpl);
			if (!svcName) {
				throw new Error(
					`[grpc] service ${ServiceImpl.name} is missing @GrpcService(name)`,
				);
			}
			const methodNames = getGrpcMethodNames(ServiceImpl.prototype);
			// @grpc/proto-loader produces nested objects, so we walk
			// the package path: proto.<package>.<serviceName>.
			const segments = this.#config.package
				? this.#config.package.split(".")
				: [];
			segments.push(svcName);
			let svcSpec: { service: any; prototype?: unknown } | Record<string, unknown> | undefined =
				this.#proto as Record<string, unknown>;
			for (const seg of segments) {
				if (svcSpec && typeof svcSpec === "object" && seg in svcSpec) {
					svcSpec = (svcSpec as Record<string, unknown>)[seg] as typeof svcSpec;
				} else {
					svcSpec = undefined;
					break;
				}
			}
			if (!svcSpec) {
				throw new Error(
					`[grpc] service "${segments.join(".")}" not found in proto definition. ` +
						`Check the .proto file and the @GrpcService name.`,
				);
			}

			// Resolve the implementation from the DI container
			const instance = resolve(ServiceImpl);
			this.#instanceByService.set(svcName, instance);

			// Build the handler map. For each @GrpcMethod, wrap
			// the user's method so it can be called as
			// (call, callback) => void and we await the Promise.
			const handlers: Record<string, any> = {};
			for (const [methodKey, protoMethodName] of Object.entries(
				methodNames,
			)) {
				const fn = (instance as Record<string, (...args: unknown[]) => unknown>)[
					methodKey
				];
				if (typeof fn !== "function") continue;
				// Bind the method to the instance so `this` is preserved
				// (the user's handler may rely on `this` to access
				// injected dependencies).
				handlers[protoMethodName] = makeUnaryHandler(fn, instance);
			}

			// svcSpec is the Client constructor; .service is the ServiceDefinition.
			this.#server!.addService((svcSpec as { service: any }).service, handlers);
			this.#clientCtors.set(svcName, svcSpec as unknown as new (...a: any[]) => any);
		}
	}

	/**
	 * Bind the server to the configured host/port. Resolves when
	 * the port is bound. Use `port: 0` in tests to let the OS
	 * pick a free port; the actual port is available via the
	 * `port` getter or the `onBound` callback.
	 */
	async start(): Promise<void> {
		if (this.#resolve && !this.#server) {
			await this.prepare(this.#resolve);
		}
		if (!this.#server) {
			throw new Error(
				"[grpc] start() called before prepare(). Call prepare() first " +
					"(typically done automatically by the DI module).",
			);
		}
		if (this.isRunning) return;

		const creds = this.#config.tls
			? ServerCredentials.createSsl(
					this.#config.tls.cert as Buffer,
					Array.isArray(this.#config.tls.key) ? this.#config.tls.key[0] : (this.#config.tls.key as Buffer),
				)
			: ServerCredentials.createInsecure();

		const port: number = await new Promise((resolveP, rejectP) => {
				// bindAsync(port: "host:port", creds, callback) — the
			// first arg is a single string, not separate host/port.
			(this.#server as GrpcServer).bindAsync(
				`${this.#config.host}:${this.#config.port}`,
				creds,
				(err: Error | null, p: number) => {
								return err ? rejectP(err) : resolveP(p);
				},
			);
		});
		this.#host = this.#config.host;
		this.#port = port;
		this.#bound = true;
		console.log(
			`✓ gRPC server listening on ${this.#config.tls ? "https" : "http"}://${this.#host}:${this.#port}`,
		);
		this.#config.onBound?.(this.#host, this.#port);
	}

	/** Stop the server and release the port. */
	async stop(): Promise<void> {
		if (!this.#server) return;
		// tryShutdown waits for all pending RPCs to complete. If
		// a client is hung, this can hang forever. Race it against
		// a 1s timeout and force-shutdown if it doesn't complete.
		await Promise.race([
			new Promise<void>((resolveP, rejectP) => {
				(this.#server as GrpcServer).tryShutdown((err?: Error) =>
					err ? rejectP(err) : resolveP(),
				);
			}),
			new Promise<void>((resolveP) => setTimeout(resolveP, 1000)),
		]).catch(() => {
			(this.#server as GrpcServer).forceShutdown();
		});
		this.#server = null;
		this.#host = null;
		this.#port = null;
		this.#bound = false;
	}

	/**
	 * Build a typed client for a gRPC service. The returned object
	 * has one Promise-returning method per service method defined
	 * in the .proto file. Method names are converted to
	 * camelCase on the client side to match JS convention
	 * (e.g. `FindById` → `findById`).
	 */
	client<T = Record<string, (...args: unknown[]) => Promise<unknown>>>(
		serviceName: string,
		options: { url: string; tls?: boolean } = {
			url: `127.0.0.1:${this.#port ?? 50051}`,
		},
	): T {
		if (!this.#proto) {
			throw new Error(
				"[grpc] client() called before prepare(). " +
					"Did you forget to call grpc.start()?",
			);
		}
		// Walk the nested proto package to find the service spec.
		const segments = this.#config.package
			? this.#config.package.split(".")
			: [];
		segments.push(serviceName);
		let svcSpec: { service: any; prototype?: unknown } | Record<string, unknown> | undefined =
			this.#proto as Record<string, unknown>;
		for (const seg of segments) {
			if (svcSpec && typeof svcSpec === "object" && seg in svcSpec) {
				svcSpec = (svcSpec as Record<string, unknown>)[seg] as typeof svcSpec;
			} else {
				svcSpec = undefined;
				break;
			}
		}
		if (!svcSpec) {
			throw new Error(
				`[grpc] service "${segments.join(".")}" not found in proto definition`,
			);
		}
		// svcSpec is the Client constructor itself.
		const ClientCtor = svcSpec as unknown as {
			new (url: string, creds: unknown): Record<string, (...args: unknown[]) => unknown>;
			service: Record<string, Record<string, unknown>>;
		};
		const creds = options.tls
			? // @ts-ignore
				require("@grpc/grpc-js").credentials.createSsl()
			: // @ts-ignore
				require("@grpc/grpc-js").credentials.createInsecure();
		const underlying = new ClientCtor(options.url, creds);
		// ServiceDefinition lists methods in PascalCase (proto form).
		// The client exposes them as camelCase on its prototype.
		const protoMethodNames = Object.keys(ClientCtor.service);
		const methodNames = protoMethodNames.map(
			(n) => n.charAt(0).toLowerCase() + n.slice(1),
		);
		const wrapped: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
		for (const methodName of methodNames) {
			// @ts-ignore - method exists on the prototype at runtime.
			const fn = underlying[methodName];
			if (typeof fn !== "function") continue;
			wrapped[methodName] = (req: unknown) =>
				new Promise((resolveP, rejectP) => {
					fn.call(underlying, req, (err: Error | null, res: unknown) => {
						if (err) {
							rejectP(err);
						} else {
							resolveP(res);
						}
					});
				});
		}
		return wrapped as unknown as T;
	}
}

/**
 * Wrap a user's async method so it can be passed to gRPC's
 * callback-style handlers. Translates thrown errors into gRPC's
 * status code 13 (INTERNAL) by default.
 */
function makeUnaryHandler(fn: (...args: unknown[]) => unknown, instance: unknown) {
	return (call: unknown, callback: (err: unknown, res?: unknown) => void) => {
		const req = (call as { request: unknown }).request;
		// Bind the method to the instance so `this` is preserved.
		// Use .then/.catch so we can correctly forward both
		// synchronous throws and async rejections to gRPC.
		let result: unknown;
		try {
			result = fn.call(instance, req);
		} catch (syncErr) {
			const e = syncErr as Error;
			const code = (e as Error & { code?: number }).code ?? 13;
			callback({ code, details: e.message });
			return;
		}
		Promise.resolve(result).then(
			(value) => callback(null, value),
			(err: Error) => {
				const code = (err as Error & { code?: number }).code ?? 13;
				// gRPC expects a plain { code, details } object, NOT
				// an Error instance.
				callback({ code, details: err.message });
			},
		);
	};
}

export default GrpcService;
