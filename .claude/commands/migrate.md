# Run database migrations

Run database migrations for `$ARGUMENTS` (use "up" for forward, "down" for rollback, "tenant" for tenant schemas).

## Commands

- Forward (public schema): `npm run migration:run`
- Rollback (public schema): `npm run migration:down`
- Forward (tenant schemas): `npm run migration:tenant`
- Rollback (tenant schemas): `npm run migration:tenant:down`

## Steps

1. Determine which migration command to run based on the argument
2. If no argument provided, run `npm run migration:run` (forward, public schema)
3. Execute the migration command
4. Report the output and any errors
