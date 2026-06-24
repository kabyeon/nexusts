# NexusTS — Claude Code Guide

This project uses **Bun** (≥ 1.3), **TypeScript**, **Hono**, **Drizzle ORM**.

## Quick start

```bash
bun install
bun run build           # build all packages
bun run test            # run tests
bun run examples:smoke  # smoke tests (69)
```

## Key conventions

- **Legacy decorators** (`experimentalDecorators: true`) — not TC39 stage-3.
- **32 independent packages** under `@nexusts/*` — each is its own bundle entry.
- **Docs must be written in BOTH English (`.md`) and Korean (`.ko.md`)** simultaneously.

## Fork workflow (conflict minimisation)

This repo is developed as a **contribution fork** of `nexus-ts/nexusts`.
Follow these rules to keep conflicts near zero.

### Core rule: `fork/main` is a mirror — never develop on it

```
fork/main = upstream/main   (always)
All work → feature branch → upstream PR → done
```

### Step-by-step

```bash
# 1. Always start from the latest upstream
git fetch upstream
git checkout -b feat/my-work upstream/main   # NOT fork/main

# 2. If upstream advances while you work, rebase immediately
git fetch upstream
git rebase upstream/main                     # resolve small conflicts early

# 3. Push to fork and open PR against nexus-ts/nexusts
git push origin feat/my-work
gh pr create --repo nexus-ts/nexusts --base main --head hoksi:feat/my-work ...

# 4. After the PR is merged, sync fork/main and delete the branch
git checkout main
git reset --hard upstream/main
git push origin main --force
git branch -d feat/my-work
git push origin --delete feat/my-work
```

### Rules

| Rule | Reason |
|------|--------|
| Never `git commit` on `fork/main` | Any commit here diverges and causes conflicts on the next sync |
| Branch from `upstream/main`, not `fork/main` | Ensures the base is always current |
| One concern per PR | Small surface = fewer conflicting files |
| Submit PRs the same day work is done | The longer a branch lives, the more upstream advances |
| `git rebase upstream/main` daily on active branches | Catch conflicts 1-at-a-time, not all at once |
| `dev-docs/` is local-only (`.gitignore`) | Session notes and issue tracking stay off the upstream |

## Full reference

See [`AGENTS.md`](./AGENTS.md) for the complete module-author guide,
decorator conventions, 7-step module addition workflow, and build pipeline details.
