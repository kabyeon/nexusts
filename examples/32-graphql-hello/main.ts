import "reflect-metadata";
import { Application, Module, Injectable, Controller, Get } from "@nexusts/core";
import { GraphQLModule, GraphQLService } from "@nexusts/graphql";

/**
 * 32-graphql-hello — minimal GraphQL endpoint.
 *
 *   GET  /            → plain text intro
 *   POST /graphql     → queries + mutations
 *   GET  /graphql     → GraphiQL playground (with ?query=... pre-baked)
 *   GET  /graphql/schema → the SDL as text/plain
 *
 *   Run: bun main.ts
 *   Then:
 *     curl -s -X POST http://localhost:3000/graphql \
 *       -H "Content-Type: application/json" \
 *       -d '{"query":"{ hello(name:\"world\") }"}'
 *
 * The `context()` factory injects a `user` field so the `whoami`
 * query can be used to verify the context wiring end-to-end.
 */

@Injectable()
class Counter {
  private n = 0;
  bump() { this.n += 1; return this.n; }
}

@Controller("/")
class HomeController {
  @Get("/")
  home() {
    return {
      graphql: "POST /graphql with { query: '{ hello(name: \"x\") }' }",
      playground: "GET /graphql in a browser",
    };
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: `
        type Query {
          hello(name: String!): String!
          whoami: String!
          add(a: Int!, b: Int!): Int!
        }
      `,
      resolvers: {
        Query: {
          hello: (_p: any, args: { name: string }) => `Hello, ${args.name}!`,
          whoami: (_p: any, _a: any, ctx: any) => ctx.state.user,
          add: (_p: any, args: { a: number; b: number }) => args.a + args.b,
        },
      },
      context: () => ({ user: "alice" }),
    }),
  ],
  controllers: [HomeController],
  providers: [Counter],
})
class AppModule {}

const app = new Application(AppModule);
const g = app.container.resolve(GraphQLService) as GraphQLService;
await GraphQLModule.mount(app.server.app, g);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);
