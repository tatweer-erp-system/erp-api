# CLAUDE.md — Project Rules

## Workflow Rules
- **Always run `npm run format` before pushing code** — this is mandatory before every `git push`
- Use conventional commits (commitlint + husky enforced)
- Config files must use plain factory functions (NOT `registerAs()` style)

## Project
- NestJS 10 + TypeScript 5 strict + Sequelize ORM + PostgreSQL
- Multi-tenant via PostgreSQL schema-per-tenant
- Path alias: `@/` maps to `src/`
