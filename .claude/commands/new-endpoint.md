# Add a new API endpoint

Add a new endpoint to module `$ARGUMENTS`.

## Steps

1. Read the target module's controller, service, and DTOs to understand existing patterns
2. Ask me what the endpoint should do (method, path, request/response shape)
3. Add the DTO(s) with class-validator decorators
4. Add the service method with proper tenant-aware Sequelize query
5. Add the controller method with proper decorators (@Get/@Post/@Put/@Delete, @ApiTags, guards)
6. Add i18n keys for any error messages
7. Run `npm run format` after changes
