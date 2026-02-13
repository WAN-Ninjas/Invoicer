# CLAUDE.md

## Workflow

- **All changes must be done in a PR** — never commit directly to `main`. Create a feature branch, commit there, and open a PR.

## Project Structure

- Monorepo with npm workspaces: `packages/api`, `packages/web`, `packages/shared`
- Docker setup: `docker/api.Dockerfile`, `docker/web.Dockerfile`, `docker-compose.yml`
- CI: `.github/workflows/ci.yml` (check → build-api / build-web)

## Commands

- `npm run typecheck` — typechecks all three packages individually
- `npm run lint` — ESLint across all packages
- `npm run build` — builds shared, api, and web
- `npm run db:generate` — generates Prisma client (required before typecheck)
- `npm run db:migrate` — runs Prisma migrations

## Important Notes

- Must run `npm run db:generate` before `npm run typecheck` (Prisma types needed)
- ESLint config is at root `.eslintrc.json`
- TypeScript base config: `tsconfig.base.json` (no root `tsconfig.json`)
