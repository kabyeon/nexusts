/**
 * gRPC decorators.
 *
 *   @Injectable()
 *   @GrpcService("UserService")
 *   class UserServiceImpl {
 *     @GrpcMethod("FindById")
 *     async findById(request: { id: number }) {
 *       return { name: "Alice", email: "alice@example.com" };
 *     }
 *   }
 *
 * The framework reads the metadata at start time and wires
 * each method to the corresponding gRPC handler. The method
 * name in the decorator must match the .proto file's method
 * name (e.g. `FindById`, not `findById`).
 */

const GRPC_SERVICE_KEY = Symbol.for("nexus:grpc:service");
const GRPC_METHOD_KEY = Symbol.for("nexus:grpc:method");

/**
 * Mark a class as a gRPC service implementation. The `name`
 * must match a `service` declaration in the .proto file.
 */
export function GrpcService(name: string): ClassDecorator {
	return function (target: Function) {
		const proto = (target as { prototype: object }).prototype ?? target;
		(proto as Record<symbol, unknown>)[GRPC_SERVICE_KEY] = { name };
	};
}

/**
 * Mark a method as a gRPC handler. The `name` must match the
 * method name in the .proto file. The method receives the
 * request object and must return a `Promise<TResponse>` (for
 * unary methods).
 */
export function GrpcMethod(name: string): MethodDecorator {
	return function (
		_target: object,
		propertyKey: string | symbol,
		_descriptor: PropertyDescriptor,
	) {
		const proto = _target as Record<symbol, unknown>;
		proto[GRPC_METHOD_KEY] = proto[GRPC_METHOD_KEY] ?? {};
		(proto[GRPC_METHOD_KEY] as Record<string | symbol, string>)[
			propertyKey
		] = name;
		return _descriptor;
	};
}

/** Read the gRPC service name. Internal. */
export function getGrpcServiceName(target: object): string | undefined {
	const t = (target as { prototype?: object }).prototype ?? target;
	return (t as Record<symbol, { name?: string } | undefined>)[
		GRPC_SERVICE_KEY
	]?.name;
}

/** Read the bound method names for a gRPC service. Internal. */
export function getGrpcMethodNames(target: object): Record<string, string> {
	const t = (target as { prototype?: object }).prototype ?? target;
	return (
		((t as Record<symbol, unknown>)[GRPC_METHOD_KEY] as
			| Record<string, string>
			| undefined) ?? {}
	);
}
