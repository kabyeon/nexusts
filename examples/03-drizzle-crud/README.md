# 03 · Drizzle CRUD

Type-safe SQLite CRUD with `@nexusts/drizzle`. Uses the
recommended **DrizzleService** + **DrizzleRepository** pattern.

## What it shows

- Defining a schema with `drizzle-orm/sqlite-core`
- `DrizzleService.forRoot({ dialect: 'bun-sqlite' })` for DI
- `DrizzleRepository` for Lucid-style typed CRUD
- `select`, `insert`, `update`, `delete` with auto-typed return values

## How to run

```bash
cd examples/03-drizzle-crud
bun main.ts
```

Then:

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

curl http://localhost:3000/users         # list
curl http://localhost:3000/users/1       # find by id
```

## Code

```ts
// schema.ts — table definition
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});
```

```ts
// user.repository.ts — Lucid-style typed repository
import { Injectable } from "@nexusts/core";
import { DrizzleRepository } from "@nexusts/drizzle";
import { users } from "./schema";

@Injectable()
export class UserRepository extends DrizzleRepository<typeof users> {
  constructor() { super(users); }
}
```

```ts
// main.ts — wire it all together
import { Module, Controller, Get, Post, Param, Body, Inject, Injectable } from "@nexusts/core";
import { DrizzleModule, DrizzleService } from "@nexusts/drizzle";
import { eq } from "drizzle-orm";
import { users } from "./schema";
import { UserRepository } from "./user.repository";

@Injectable()
class UserController {
  constructor(
    @Inject(UserRepository) private users: UserRepository,
    @Inject(DrizzleService.TOKEN) private db: DrizzleService,
  ) {}

  @Get("/users")
  async list() {
    return this.users.findAll();
  }

  @Get("/users/:id")
  async find(@Param("id") id: string) {
    return this.users.findById(Number(id));
  }

  @Post("/users")
  async create(@Body() body: { email: string; name: string }) {
    return this.users.create(body);
  }
}

@Module({
  imports: [DrizzleModule.forRoot({ dialect: "bun-sqlite", connection: { url: "app.db" } })],
  controllers: [UserController],
  providers: [UserRepository],
})
class AppModule {}

const app = new Application(AppModule);
// ensure the table exists
app.container.resolve(DrizzleService.TOKEN).raw
  .apply();
await app.listen(3000);
```

## Notes

- `DrizzleService` **auto-opens** the connection in its constructor — no manual `await open()` needed
- `DrizzleRepository` extends a typed base with `findAll`, `findById`, `create`, `update`, `delete`
- The Drizzle service uses **`raw\`...\``** template strings for SQL-injection-safe queries
- For real apps use `nx db:generate` + `nx db:migrate` to manage schema migrations
