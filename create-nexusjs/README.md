# create-nexusjs

Scaffold a new [NexusJS](https://github.com/kabyeon/nexusjs) project.

```bash
bunx create-nexusjs my-app
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

Internally runs `npx @kabyeon/nexusjs init --no-interaction` in the new directory.
