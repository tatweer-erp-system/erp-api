# Create a new database migration

Create a new Sequelize migration for `$ARGUMENTS`.

## Steps

1. Read `src/database/` to understand the existing migration structure and naming convention
2. Create a new migration file with a timestamp prefix following the project's pattern
3. Ask me what schema changes are needed (tables, columns, indexes, constraints)
4. Write the `up` and `down` functions with proper Sequelize QueryInterface calls
5. Consider multi-tenant implications — if the migration affects tenant tables, it should run per-schema
6. Run `npm run format` after creating the file
