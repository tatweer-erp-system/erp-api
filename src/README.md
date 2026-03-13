# src/ — Full File Inventory

Complete file reference for the ERP backend. Use this to locate any file without exploring the tree.

---

## Entry Points

| File | Purpose |
|---|---|
| `main.ts` | Bootstrap: Sentry init, Winston logger, helmet, CORS, global prefix `api/v1`, URI versioning, ValidationPipe, GlobalExceptionFilter, ResponseInterceptor, AuditInterceptor, Swagger |
| `app.module.ts` | Root module: ConfigModule (all configs), ThrottlerModule, I18nModule (AcceptLanguageResolver), DatabaseModule, all infrastructure modules, all business modules, LoggerMiddleware + TenantResolverMiddleware globally applied |

---

## config/

7 register functions loaded by `ConfigModule.forRoot({ load: [...] })`.

| File | Exported config key | Key env vars |
|---|---|---|
| `app.config.ts` | `app` | PORT, NODE_ENV, SUPER_ADMIN_IPS, DEFAULT_LANG, SENTRY_DSN |
| `database.config.ts` | `database` | DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME |
| `redis-cache.config.ts` | `redisCache` | REDIS_CACHE_HOST, REDIS_CACHE_PORT |
| `redis-queue.config.ts` | `redisQueue` | REDIS_QUEUE_HOST, REDIS_QUEUE_PORT |
| `jwt.config.ts` | `jwt` | JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN |
| `firebase.config.ts` | `firebase` | FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY |
| `storage.config.ts` | `storage` | STORAGE_PROVIDER, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, AWS_REGION |

---

## common/

### types/

| File | Exports |
|---|---|
| `types/request.types.ts` | `JwtPayload`, `AuthenticatedUser`, `AuthenticatedRequest` |
| `types/permission.types.ts` | `PermissionConditions`, `ResolvedPermission`, `PermissionString` |
| `types/i18n.types.ts` | `LocalizedString { en, ar }`, `SupportedLanguage` |

### dto/

| File | Exports |
|---|---|
| `dto/pagination.dto.ts` | `PaginationDto` — page, limit, search, sortBy, sortOrder, `offset` getter |
| `dto/base-response.dto.ts` | `BaseResponseDto<T>`, `ErrorResponseDto` |

### decorators/

| File | Decorator | Usage |
|---|---|---|
| `decorators/current-user.decorator.ts` | `@CurrentUser()` | Extracts `req.user` |
| `decorators/tenant.decorator.ts` | `@TenantSlug()` | Extracts `req.tenantSlug` |
| `decorators/permissions.decorator.ts` | `@Permissions(...perms)` | Sets `PERMISSIONS_KEY` metadata |
| `decorators/public.decorator.ts` | `@Public()` | Sets `IS_PUBLIC_KEY` metadata — skips JWT guard |
| `decorators/cache-response.decorator.ts` | `@CacheResponse(ttl)` | Triggers `CacheInterceptor` |

### guards/

| File | Guard | Logic |
|---|---|---|
| `guards/jwt-auth.guard.ts` | `JwtAuthGuard` | Extends `AuthGuard('jwt')`, skips if `@Public()` |
| `guards/refresh-token.guard.ts` | `RefreshTokenGuard` | Extends `AuthGuard('jwt-refresh')` |
| `guards/permissions.guard.ts` | `PermissionsGuard` | Reads Redis `perm:{slug}:{userId}` → DB fallback → evaluates `module:action` |
| `guards/super-admin-ip.guard.ts` | `SuperAdminIpGuard` | Checks client IP against `app.superAdminIps` env |

### interceptors/

| File | Interceptor | Logic |
|---|---|---|
| `interceptors/response.interceptor.ts` | `ResponseInterceptor` | Wraps response in `{ success, data, meta, timestamp, lang }`, flattens `LocalizedString` fields by `Accept-Language` |
| `interceptors/audit.interceptor.ts` | `AuditInterceptor` | POST/PATCH/PUT/DELETE → writes to `audit_logs` after response |
| `interceptors/tenant.interceptor.ts` | `TenantInterceptor` | Sets `search_path` for tenant schema on each request |
| `interceptors/cache.interceptor.ts` | `CacheInterceptor` | Checks/sets response cache based on `@CacheResponse()` decorator |

### filters/

| File | Filter |
|---|---|
| `filters/global-exception.filter.ts` | `GlobalExceptionFilter` — catches all, formats error response, captures to Sentry |

### pipes/

| File | Pipe |
|---|---|
| `pipes/validation.pipe.ts` | `ValidationPipe` — whitelist, forbidNonWhitelisted, transform |

### middleware/

| File | Middleware |
|---|---|
| `middleware/tenant-resolver.middleware.ts` | Extracts `tenantSlug` from JWT payload into `req.tenantSlug` |
| `middleware/logger.middleware.ts` | HTTP request/response logging with elapsed time (Winston) |

---

## database/

| File | Purpose |
|---|---|
| `base.entity.ts` | Abstract Sequelize Model: UUID PK, createdAt, updatedAt, deletedAt, createdBy, updatedBy, version |
| `database.module.ts` | Global module — `SequelizeModule.forRootAsync` with pool config (public schema) |
| `tenant-sequelize.service.ts` | Connection pool per tenant: `Map<slug, Sequelize>`, `getSequelizeForTenant()`, `createTenantSchema()`, `setSearchPath()` |
| `umzug.service.ts` | `runSharedMigrations()` (public schema) and `runTenantMigrations(slug)` using Umzug 3 |

### migrations/shared/

| File | Creates |
|---|---|
| `20240101000000-create-tenants.ts` | `public.tenants`, `public.super_admins` |

### migrations/tenant/

| File | Creates |
|---|---|
| `20240101000001-create-users.ts` | `users` table |
| `20240101000002-create-roles-permissions.ts` | `roles`, `permissions`, `rolePermissions`, `userRroles` |
| `20240101000003-create-audit-logs.ts` | `audit_logs` |
| `20240101000004-create-notifications.ts` | `notifications` |
| `20240101000005-create-fcm-tokens.ts` | `user_fcm_tokens` |

---

## infrastructure/

See [infrastructure/README.md](infrastructure/README.md).

---

## i18n/

Translation files for `nestjs-i18n`. Resolved via `Accept-Language` header.

```
i18n/
├── en/
│   ├── common.json
│   ├── errors.json
│   └── notifications.json
└── ar/
    ├── common.json
    ├── errors.json
    └── notifications.json
```

---

## modules/

See [modules/README.md](modules/README.md).

---

## health/

| File | Purpose |
|---|---|
| `health/health.controller.ts` | `@Public()` — Terminus health checks: DB, disk, memory |
