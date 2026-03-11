# CLAUDE.md — Project Rules

## Workflow Rules
- **Always run `npm run format` before pushing code** — this is mandatory before every `git push`
- Use conventional commits (commitlint + husky enforced)
- Config files must use plain factory functions (NOT `registerAs()` style)

## Git Branching
- **Main branch:** `prod` (protected — never push directly)
- **Branch prefixes:** `feat/`, `fix/`, `hotfix/`, `chore/`, `refactor/`
- Branch names: lowercase, kebab-case (e.g., `feat/invoice-export`)
- Always branch from `dev`, PR into `dev`
- Hotfixes branch from `prod`, merge into both `prod` and `dev`
- Delete branches after merge

## Project
- NestJS 10 + TypeScript 5 strict + Sequelize ORM + PostgreSQL
- Multi-tenant via PostgreSQL schema-per-tenant
- Path alias: `@/` maps to `src/`
