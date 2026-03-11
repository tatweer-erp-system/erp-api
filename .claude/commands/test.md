# Run tests

Run tests for `$ARGUMENTS` (module name, file path, or "all").

## Steps

1. If argument is "all" or empty — run `npm test`
2. If argument is a module name — run `npm test -- --testPathPattern=<module-name>`
3. If argument is a file path — run `npm test -- <file-path>`
4. If argument is "e2e" — run `npm run test:e2e`
5. If argument is "cov" — run `npm run test:cov`
6. Report test results, highlighting any failures with file paths and line numbers
7. If tests fail, analyze the errors and suggest fixes
