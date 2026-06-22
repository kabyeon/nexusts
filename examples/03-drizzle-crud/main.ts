import "reflect-metadata";
import { sql } from "drizzle-orm";
import {
  Application, Module, Controller, Get, Post, Param, Body, Inject, Injectable,
} from "@kabyeon/nexusjs";
import { DrizzleModule, DrizzleRepository, DrizzleService } from "@kabyeon/nexusjs/drizzle";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * 03-drizzle-crud — type-safe SQLite CRUD with Drizzle.
 *
 * Run: bun main.ts
 * Try:
 *   curl -X POST http://localhost:3000/users -H "Content-Type: application/json" \
 *        -d '{"name":"Alice","email":"alice@example.com"}'
 *   curl http://localhost:3000/users
 */

// ─── 1. Schema ─────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
});

// ─── 2. Repository — Lucid-style typed CRUD ───────────────────────
@Injectable()
export class UserRepository extends DrizzleRepository<typeof users> {
  constructor() { super(users); }
}

// ─── 3. Controller ────────────────────────────────────────────────
@Injectable()
@Controller("/users")
export class UserController {
  constructor(
    @Inject(UserRepository) private users: UserRepository,
    @Inject(DrizzleService.TOKEN) private db: DrizzleService,
  ) {}

  @Get("/")
  list() {
    return this.users.findAll();
  }

  @Get("/:id")
  find(@Param("id") id: string) {
    return this.users.findById(Number(id));
  }

  @Post("/")
  create(@Body() body: { email: string; name: string }) {
    return this.users.create(body);
  }
}

// ─── 4. Module wiring ────────────────────────────────────────────
@Module({
  imports: [
    DrizzleModule.forRoot({
      dialect: "bun-sqlite",
      connection: { url: "app.db" },
    }),
  ],
  controllers: [UserController],
  providers: [UserRepository],
})
class AppModule {}

// ─── 5. Bootstrap ────────────────────────────────────────────────
const app = new Application(AppModule);

// ensure the table exists (in real apps use `nx db:migrate`).
await app.container
  .resolve(DrizzleService.TOKEN)
  .client
  .run(sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL)`);

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);