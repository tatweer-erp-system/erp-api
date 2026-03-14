# Run database migrations

Run database migrations for `$ARGUMENTS` (use "up" for forward, "down" for rollback, "tenant" for tenant schemas).

## Commands

- Forward (public schema): `npm run migration:up`
- Rollback (public schema): `npm run migration:down`

## Steps

1. Determine which migration command to run based on the argument
2. If no argument provided, run `npm run migration:up` (forward, public schema)
3. Execute the migration command
4. Report the output and any errors
