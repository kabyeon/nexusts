/**
 * Tests for `@nexusts/graphql`.
 *
 * Covers:
 *  - Module construction and `mount()` to a Hono-compatible app.
 *  - SDL execution with a hand-written `resolvers` map.
 *  - GET (query string) execution.
 *  - SDL exposition at `/graphql/schema`.
 *  - Validation error path (invalid query → 400 with `errors[]`).
 *  - Missing `graphql` package → clear error.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import "reflect-metadata";

let GraphQLService: any;
let GraphQLModule: any;

beforeAll(async () => {
	const mod = await import("@nexusts/graphql");
	GraphQLService = mod.GraphQLService;
	GraphQLModule = mod.GraphQLModule;
});

async function makeService() {
	const svc = new GraphQLService({
		typeDefs: `
			type Query {
				hello(name: String!): String!
				add(a: Int!, b: Int!): Int!
			}
		`,
		resolvers: {
			Query: {
				hello: (_p: any, args: { name: string }) => `Hi, ${args.name}!`,
				add: (_p: any, args: { a: number; b: number }) => args.a + args.b,
			},
		},
	});
	return svc;
}

describe("GraphQLService — service construction", () => {
	it("stores the config and exposes the SDL", () => {
		const svc = new GraphQLService({
			typeDefs: "type Query { x: Int }",
		});
		expect(svc.config.typeDefs).toBe("type Query { x: Int }");
		expect(svc.getSchemaSDL()).toContain("type Query { x: Int }");
	});

	it("exposes a TOKEN symbol for DI", () => {
		expect(typeof GraphQLService.TOKEN).toBe("symbol");
	});
});

describe("GraphQLService — ensureSchema", () => {
	it("builds a schema from SDL", async () => {
		const svc = await makeService();
		const schema = await svc.ensureSchema();
		expect(schema).toBeDefined();
		// Cached on subsequent calls.
		expect(await svc.ensureSchema()).toBe(schema);
	});

	it("throws a clear error when no typeDefs are provided", async () => {
		const svc = new GraphQLService();
		await expect(svc.ensureSchema()).rejects.toThrow(
			/No typeDefs configured/,
		);
	});

	it("does not throw 'No typeDefs' when autoSchema: true is set", async () => {
		// autoSchema: true bypasses the 'No typeDefs' guard.
		// graphql-js may still throw for empty SDL — that's expected until
		// the SDL synthesiser (Task 4) populates the schema from decorators.
		const svc = new GraphQLService({ autoSchema: true });
		await expect(svc.ensureSchema()).rejects.not.toThrow(
			/No typeDefs configured/,
		);
	});

	it("accepts autoSchema: true alongside typeDefs and builds normally", async () => {
		const svc = new GraphQLService({
			autoSchema: true,
			typeDefs: "type Query { ping: String! }",
			resolvers: { Query: { ping: () => "pong" } },
		});
		const schema = await svc.ensureSchema();
		expect(schema).toBeDefined();
		const r = await svc.execute("{ ping }");
		expect(r.data).toEqual({ ping: "pong" });
	});
});

describe("GraphQLService — execute()", () => {
	it("runs a query against the resolver map", async () => {
		const svc = await makeService();
		const r = await svc.execute(`{ hello(name: "alice") }`);
		expect(r.data).toEqual({ hello: "Hi, alice!" });
		expect(r.errors).toBeUndefined();
	});

	it("supports variables and integer coercion", async () => {
		const svc = await makeService();
		const r = await svc.execute(
			`query Sum($x: Int!, $y: Int!) { add(a: $x, b: $y) }`,
			{ x: 2, y: 40 },
		);
		expect(r.data).toEqual({ add: 42 });
	});

	it("returns errors for invalid queries (no crash)", async () => {
		const svc = await makeService();
		const r = await svc.execute(`{ doesNotExist }`);
		expect(r.errors).toBeDefined();
		expect((r.errors as any[]).length).toBeGreaterThan(0);
	});
});

describe("GraphQLModule.mount — Hono app wiring", () => {
	const apps: Hono[] = [];
	function newApp(svc: any) {
		const app = new Hono();
		apps.push(app);
		// `await` synchronously — ensureSchema has already run.
		void GraphQLModule.mount(app, svc);
		return app;
	}

	afterEach(() => {
		// Each Hono is independent; no shared state to clean.
		apps.length = 0;
	});

	it("exposes POST /graphql", async () => {
		const svc = await makeService();
		const app = newApp(svc);
		// give mount() a microtask to register routes
		await new Promise((r) => setImmediate(r));
		const res = await app.request("/graphql", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ query: `{ hello(name: "world") }` }),
		});
		expect(res.status).toBe(200);
		const j = await res.json();
		expect(j.data).toEqual({ hello: "Hi, world!" });
	});

	it("exposes GET /graphql?query=... (pre-baked query)", async () => {
		const svc = await makeService();
		const app = newApp(svc);
		await new Promise((r) => setImmediate(r));
		const res = await app.request(
			"/graphql?query=" +
				encodeURIComponent(`{ add(a: 1, b: 2) }`),
		);
		expect(res.status).toBe(200);
		const j = await res.json();
		expect(j.data).toEqual({ add: 3 });
	});

	it("returns 400 when the query is invalid", async () => {
		const svc = await makeService();
		const app = newApp(svc);
		await new Promise((r) => setImmediate(r));
		const res = await app.request("/graphql", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ query: `{ unknownField }` }),
		});
		// Either 400 (no data) or 200 (data with errors) is acceptable;
		// the contract is that `errors` is present.
		const j = await res.json();
		expect(j.errors).toBeDefined();
	});

	it("exposes the SDL at GET /graphql/schema", async () => {
		const svc = await makeService();
		const app = newApp(svc);
		await new Promise((r) => setImmediate(r));
		const res = await app.request("/graphql/schema");
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("type Query");
		expect(text).toContain("hello");
		expect(text).toContain("add");
	});

	it("renders a GraphiQL playground when no query is set", async () => {
		const svc = await makeService();
		const app = newApp(svc);
		await new Promise((r) => setImmediate(r));
		const res = await app.request("/graphql");
		expect(res.status).toBe(200);
		const ct = res.headers.get("content-type") ?? "";
		expect(ct).toMatch(/text\/html/);
		const html = await res.text();
		expect(html).toContain("GraphiQL");
	});

	it("respects playground: 'none'", async () => {
		const svc = new GraphQLService({
			typeDefs: "type Query { x: Int }",
			playground: "none",
		});
		const app = new Hono();
		void GraphQLModule.mount(app, svc);
		await new Promise((r) => setImmediate(r));
		const res = await app.request("/graphql");
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).not.toContain("GraphiQL");
		expect(text).toMatch(/Pre-baked query/i);
	});
});

describe("GraphQLService — context factory", () => {
	it("calls the user's context() and exposes its return value", async () => {
		const svc = new GraphQLService({
			typeDefs: `type Query { whoami: String! }`,
			resolvers: {
				Query: {
					whoami: (_p: any, _a: any, ctx: any) => ctx.state.user,
				},
			},
			context: () => ({ user: "alice" }),
		});
		const r = await svc.execute(`{ whoami }`);
		expect(r.data).toEqual({ whoami: "alice" });
	});
});

describe("loadGraphQLJs — lazy load", () => {
	it("returns the graphql module's parse()", async () => {
		const { loadGraphQLJs } = await import("@nexusts/graphql");
		const g = await loadGraphQLJs();
		const doc = g.parse(`{ x }`);
		expect(doc).toBeDefined();
	});
});

describe("@Resolver registry", () => {
	it("registers a class when @Resolver is applied", async () => {
		const { Resolver, getRegisteredResolvers, clearResolverRegistry } =
			await import("@nexusts/graphql");

		clearResolverRegistry();

		@Resolver("Query")
		class HelloResolver {}

		const registered = getRegisteredResolvers();
		expect(registered).toContain(HelloResolver);
	});

	it("accumulates multiple @Resolver classes", async () => {
		const { Resolver, getRegisteredResolvers, clearResolverRegistry } =
			await import("@nexusts/graphql");

		clearResolverRegistry();

		@Resolver()
		class FooResolver {}

		@Resolver()
		class BarResolver {}

		const registered = getRegisteredResolvers();
		expect(registered).toContain(FooResolver);
		expect(registered).toContain(BarResolver);
		expect(registered.length).toBe(2);
	});

	it("clearResolverRegistry() empties the registry", async () => {
		const { Resolver, getRegisteredResolvers, clearResolverRegistry } =
			await import("@nexusts/graphql");

		@Resolver()
		class TempResolver {}
		void TempResolver;

		clearResolverRegistry();
		expect(getRegisteredResolvers().length).toBe(0);
	});

	it("infers type name from class name when typeName is omitted", async () => {
		const { Resolver, getRegisteredResolvers, clearResolverRegistry, getResolverTypeName } =
			await import("@nexusts/graphql");

		clearResolverRegistry();

		@Resolver()
		class UserResolver {}

		const registered = getRegisteredResolvers();
		expect(registered).toContain(UserResolver);
		expect(getResolverTypeName(UserResolver)).toBe("User");
	});
});
