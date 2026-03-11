# TypeScript type check

Run TypeScript type checking on the API project without emitting files.

## Steps

1. Run `npx tsc --noEmit` in the erp-api directory
2. If there are errors, list each error with its file path and line number
3. For each error, read the relevant code and suggest a fix
4. Apply fixes if they are straightforward and safe
5. Re-run the type check to confirm all errors are resolved
