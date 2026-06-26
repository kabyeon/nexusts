# @nexusts/kysely — 타입 안전 SQL 쿼리 빌더

`@nexusts/kysely`는 [Kysely](https://kysely.dev/)를 퍼스트파티로 통합한 모듈입니다.
Kysely는 TypeScript를 위한 타입 안전 SQL 쿼리 빌더입니다. 이 모듈은 다음과 같은 기능을 제공합니다:

- **`KyselyService`** — Kysely 인스턴스를 래핑하여 지연 초기화, DI 지원, 라이프사이클 관리
- **`KyselyRepository`** — Lucid 스타일의 리포지토리 패턴 (타입 안전 CRUD)
- **`KyselyModule.forRoot()`** — 설정 및 마이그레이션 지원 동적 모듈 등록
- **내장 마이그레이션** — Kysely `Migrator` 클래스 기반
- **트랜잭션 지원** — ACID 트랜잭션 (스코프드 쿼리 빌더)
- **스키마 빌딩** — DDL을 위한 Kysely 스키마 빌더

---

## 설치

```bash
bun add @nexusts/kysely
bun add kysely      # 피어 의존성
```

데이터베이스 드라이버도 필요합니다:

```bash
# SQLite
bun add better-sqlite3

# PostgreSQL
bun add pg

# MySQL
bun add mysql2
```

---

## 빠른 시작

### 1. 데이터베이스 스키마 타입 정의

```ts
interface DB {
  users: {
    id: Generated<number>;
    email: string;
    name: string;
    age: number;
    created_at: Generated<string>;
  };
  posts: {
    id: Generated<number>;
    title: string;
    content: string;
    user_id: number;
  };
}
```

### 2. 모듈 등록

```ts
import { SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { Module } from "@nexusts/core";
import { KyselyModule } from "@nexusts/kysely";

@Module({
  imports: [
    KyselyModule.forRoot({
      config: {
        dialect: new SqliteDialect({
          database: new Database("app.db"),
        }),
      },
      logging: true,
    }),
  ],
})
class AppModule {}
```

### 3. KyselyService 주입 및 사용

```ts
import { Inject, Injectable } from "@nexusts/core";
import { KyselyService } from "@nexusts/kysely";

@Injectable()
class UserService {
  @Inject(KyselyService.TOKEN) declare db: KyselyService<DB>;

  async findAll() {
    return this.db.selectFrom("users")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
  }

  async findById(id: number) {
    return this.db.selectFrom("users")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }
}
```

---

## KyselyService API

### 쿼리 빌더

| 메서드 | 설명 | 반환값 |
|--------|------|--------|
| `selectFrom(table)` | SELECT 쿼리 시작 | `SelectQueryBuilder` |
| `insertInto(table)` | INSERT 쿼리 시작 | `InsertQueryBuilder` |
| `updateTable(table)` | UPDATE 쿼리 시작 | `UpdateQueryBuilder` |
| `deleteFrom(table)` | DELETE 쿼리 시작 | `DeleteQueryBuilder` |
| `schema` | 스키마 빌더 접근 | `SchemaBuilder` |

### 트랜잭션

```ts
const result = await db.transaction(async (trx) => {
  const user = await trx.insertInto("users")
    .values({ email: "a@b.com", name: "Alice", age: 30 })
    .returningAll()
    .executeTakeFirst();

  return user;
});
```

### 마이그레이션

```ts
KyselyModule.forRoot({
  config: { dialect: new SqliteDialect({ database: new Database("app.db") }) },
  migrations: {
    provider: new FileMigrationProvider({
      fs, path,
      migrationFolder: path.join(import.meta.dir, "migrations"),
    }),
    autoMigrate: true,
  },
});
```

### CLI 기반 마이그레이션 워크플로

NexusTS는 `nx db:generate`와 `nx db:migrate` 명령어로
Kysely 마이그레이션을 지원합니다. Drizzle의 `drizzle-kit`과 달리
외부 CLI가 필요하지 않습니다:

```bash
# 1. 마이그레이션 파일 생성
nx db:generate create_users_table --orm kysely
# → app/database/migrations/20260626_123000_create_users_table.ts

# 2. 생성된 파일 검토 및 편집

# 3. 마이그레이션 적용
nx db:migrate --orm kysely
# → Kysely Migrator가 .ts 로드 → up() 실행
```

**Drizzle vs Kysely 마이그레이션:**

| 기능 | Drizzle | Kysely |
|------|---------|--------|
| 엔진 | `drizzle-kit` (외부 CLI) | Kysely `Migrator` (내장) |
| 파일 형식 | SQL (`*.sql`) | TypeScript (`*.ts`) |
| 개발 의존성 | `drizzle-kit` 설치 필요 | 없음 |
| 추적 테이블 | `__nexus_migrations` | `kysely_migration` |
| 생성 명령어 | `nx db:generate [name]` | `nx db:generate [name] --orm kysely` |
| 적용 명령어 | `nx db:migrate` | `nx db:migrate --orm kysely` |

---

## KyselyRepository — Lucid 스타일 CRUD

```ts
@Injectable()
class UserRepository extends KyselyRepository<DB, "users"> {
  @Inject(KyselyService.TOKEN) declare db: KyselyService<DB>;
  protected readonly tableName = "users";
}

// 사용 예
const users = await repo.findAll({
  where: (qb) => qb.where("age", ">=", 18),
  orderBy: (qb) => qb.orderBy("name", "asc"),
});
const user = await repo.findById(42);
await repo.create({ email: "a@b.com", name: "Alice", age: 30 });
await repo.updateById(42, { name: "Bob" });
await repo.deleteById(42);
const total = await repo.count();
```

---

## Kysely vs Drizzle 비교

| 기능 | `@nexusts/kysely` | `@nexusts/drizzle` |
|------|-------------------|-------------------|
| 쿼리 스타일 | SQL 체인 빌더 | ORM 스타일 테이블 객체 |
| 타입 안전 | 컴파일 타임 (제네릭 `DB`) | 테이블 정의 (런타임 + 컴파일) |
| 스키마 정의 | TypeScript 인터페이스 | Drizzle `pgTable` / `sqliteTable` |
| 마이그레이션 | Kysely `Migrator` (내장) | Drizzle Kit (외부 CLI) |

Kysely는 최대 타입 안전성을 원할 때, Drizzle은 ORM 스타일을 선호할 때 선택하세요.

---

## 참고

- [Kysely 공식 문서](https://kysely.dev/docs)
- [예제: Kysely CRUD](../../examples/36-kysely-crud)
- [Drizzle 통합 가이드](../user-guide/drizzle.md)
