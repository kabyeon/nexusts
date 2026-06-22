# create-nexusts

Scaffold a new [NexusTS](https://github.com/kabyeon/nexusts) project.

```bash
bunx create-nexusts my-app
cd my-app
bun install
bun run dev
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--style` | `nest` | Routing style: `nest`, `adonis`, `functional` |
| `--view` | `rendu` | View engine: `rendu`, `edge`, `eta`, `inertia`, `none` |
| `--orm` | `drizzle` | ORM: `drizzle`, `prisma`, `kysely`, `none` |
| `--db` | `bun-sqlite` | Database: `bun-sqlite`, `postgres`, `mysql`, `none` |

Internally runs `npx @nexusts/core init --no-interaction` in the new directory.
