# Create a new NestJS module

Create a new module named `$ARGUMENTS` following the project's existing patterns.

## Steps

1. Read `src/modules/` to see existing module structure and follow the same pattern exactly.
2. Create the following files inside `src/modules/<module-name>/`:
   - `<module-name>.module.ts` — NestJS module with controller, service, and Sequelize model registration
   - `<module-name>.controller.ts` — REST controller with CRUD endpoints under `/api/v1/<module-name>`
   - `<module-name>.service.ts` — Service with tenant-aware Sequelize queries
   - `dto/create-<module-name>.dto.ts` — Create DTO with class-validator decorators
   - `dto/update-<module-name>.dto.ts` — Update DTO (PartialType of create)
   - `dto/query-<module-name>.dto.ts` — Query/filter DTO with pagination
   - `models/<module-name>.model.ts` — Sequelize model definition
3. Register the new module in `src/app.module.ts`
4. Use the path alias `@/` for imports
5. Ensure multi-tenant support (schema-per-tenant pattern used in this project)
6. Add i18n support for any user-facing error messages
7. Run `npm run format` after all files are created
