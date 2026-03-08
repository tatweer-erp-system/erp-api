# NestJS ERP Backend — Claude Code Build Prompt

## Mission
Build a complete, production-ready NestJS ERP backend for SMEs.
Follow every architectural decision below exactly. Do not scaffold stubs or placeholder files.
Every file must be fully implemented, properly typed, and correctly wired into the module system.
If you hit a technical blocker, explain why before choosing an alternative.

---

## Complete Stack

| Concern | Choice |
|---|---|
| Framework | NestJS 10, single app |
| Language | TypeScript 5, strict mode |
| Database | PostgreSQL 16, schema-per-tenant |
| ORM | sequelize + sequelize-typescript |
| Migrations | Umzug 3, TypeScript migration files |
| Cache | Redis (port 6379), cache-manager-ioredis-yet |
| Queue | BullMQ + Redis (port 6380, separate instance) |
| Real-time | Socket.IO via @nestjs/websockets |
| Chat Storage | Firebase Firestore |
| Push Notifications | Firebase Cloud Messaging (FCM) via BullMQ queue |
| SMS | Twilio |
| In-app Notifications | PostgreSQL (stored) + WebSocket (real-time delivery) |
| Email | Nodemailer + Handlebars templates, via BullMQ |
| PDF | Puppeteer |
| File Storage | AWS S3 via @aws-sdk/client-s3, abstracted |
| i18n messages | nestjs-i18n, Accept-Language header (en/ar) |
| i18n data | JSONB columns: { en: string, ar: string } |
| Auth | JWT (15m) + Refresh Tokens (7d) |
| Authorization | RBAC + permissions per module, ABAC-ready via conditions JSONB |
| API versioning | URL-based: /api/v1/ |
| API Docs | Swagger at /api/v1/docs |
| Logging | Winston + nest-winston, structured JSON |
| Error Tracking | Sentry (@sentry/node) |
| Security | Helmet, CORS, @nestjs/throttler per-tenant, IP whitelist guard |
| Config | @nestjs/config + .env per environment |
| Testing | Jest + Supertest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Architecture Decisions

### Multi-Tenancy: Schema-Per-Tenant
- Public schema holds: `tenants`, `super_admins`
- Each company gets: `tenant_{slug}` schema with full table isolation
- On every request: `TenantResolverMiddleware` extracts slug from JWT, `TenantSequelizeService` sets `search_path = tenant_{slug}`
- On tenant provision: create schema → run all tenant Umzug migrations → seed default roles + permissions → create first admin user

### Base Entity (all models inherit this)
```typescript
id: UUID (primary key, auto-generated)
createdAt: Date
updatedAt: Date
deletedAt: Date | null        // soft delete, paranoid: true on all models
createdBy: UUID | null        // auto-set by AuditInterceptor
updatedBy: UUID | null        // auto-set by AuditInterceptor
version: number (default 0)   // optimistic locking on financial entities
```

### Permission Model (RBAC → ABAC ready)
```typescript
module: string       // e.g. 'invoices'
action: string       // e.g. 'approve'
conditions: JSONB    // optional: { ownedBy: 'self', maxAmount: 10000 }
```
Usage: `@Permissions('invoices:approve')` + `PermissionsGuard`
Cache key: `perm:{tenantSlug}:{userId}` in Redis, TTL 5 minutes

### Redis — Two Separate Instances
- **Cache Redis (6379)**: user permissions (TTL 5m), tenant config (TTL 1h), API response cache, JWT refresh token store (TTL 7d)
- **Queue Redis (6380)**: BullMQ only

### BullMQ Queues
```
QUEUE_MAIL          → mail.processor
QUEUE_FCM           → fcm.processor
QUEUE_SMS           → sms.processor
QUEUE_PAYROLL       → payroll.processor     (next phase)
QUEUE_INVOICES      → invoice-pdf.processor (next phase)
QUEUE_REPORTS       → report-export.processor
QUEUE_INVENTORY     → low-stock.processor
```

### i18n Pattern
- API messages: `this.i18n.t('errors.NOT_FOUND', { lang })` via Accept-Language header
- Data fields: `name: { en: 'Office Chair', ar: 'كرسي مكتب' }` stored as JSONB
- ResponseInterceptor flattens LocalizedString fields based on Accept-Language automatically

### Standardized API Response
```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 150 }, "timestamp": "", "lang": "ar" }
{ "success": false, "error": { "code": "INVOICE_NOT_FOUND", "message": "الفاتورة غير موجودة", "statusCode": 404 }, "timestamp": "" }
```

### Chat Architecture (Firestore)
Firestore collections namespaced per tenant:
```
tenants/{tenantSlug}/conversations/{conversationId}
  type: 'direct' | 'support' | 'group'
  participants: string[]
  lastMessage: { text, senderId, timestamp }
  unreadCount: { [userId]: number }

tenants/{tenantSlug}/conversations/{conversationId}/messages/{messageId}
  senderId, text, attachments[], reactions{}, replyTo, readBy{}, deliveredTo{}, createdAt, deletedAt
```
- NestJS manages conversation metadata and permissions
- Clients read messages directly from Firestore SDK
- On new message: NotificationsService queues FCM for offline participants
- ChatGateway emits `chat:message` via Socket.IO as fallback

### Notification Channels
1. **FCM** → QUEUE_FCM → fcm.processor → firebase-admin messaging
2. **SMS** → QUEUE_SMS → sms.processor → Twilio
3. **Email** → QUEUE_MAIL → mail.processor → Nodemailer
4. **In-app** → PostgreSQL notifications table + Socket.IO `notification:new`

FCM device tokens: `user_fcm_tokens` table (one user, many devices)

### WebSocket Rooms
```
tenant:{slug}:user:{userId}       // personal notifications
tenant:{slug}:role:{roleName}     // role-wide broadcasts
tenant:{slug}:group:{groupId}     // group chat
```

### Security
```typescript
app.use(helmet())
app.enableCors({ origin: allowedOrigins })
@Throttle({ default: { limit: 100, ttl: 60000 } })
@UseGuards(SuperAdminIpGuard)   // reads SUPER_ADMIN_IPS from env
```

---

## Full Project Structure

```
erp-backend/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── docker/
│   ├── Dockerfile
│   └── Dockerfile.dev
├── docker-compose.yml
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── tsconfig.json
├── package.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   ├── app.config.ts
    │   ├── database.config.ts
    │   ├── redis-cache.config.ts
    │   ├── redis-queue.config.ts
    │   ├── jwt.config.ts
    │   ├── firebase.config.ts
    │   └── storage.config.ts
    ├── common/
    │   ├── decorators/
    │   │   ├── current-user.decorator.ts
    │   │   ├── tenant.decorator.ts
    │   │   ├── permissions.decorator.ts
    │   │   ├── public.decorator.ts
    │   │   └── cache-response.decorator.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── refresh-token.guard.ts
    │   │   ├── permissions.guard.ts
    │   │   └── super-admin-ip.guard.ts
    │   ├── interceptors/
    │   │   ├── response.interceptor.ts
    │   │   ├── audit.interceptor.ts
    │   │   ├── tenant.interceptor.ts
    │   │   └── cache.interceptor.ts
    │   ├── filters/
    │   │   └── global-exception.filter.ts
    │   ├── pipes/
    │   │   └── validation.pipe.ts
    │   ├── middleware/
    │   │   ├── tenant-resolver.middleware.ts
    │   │   └── logger.middleware.ts
    │   ├── dto/
    │   │   ├── pagination.dto.ts
    │   │   └── base-response.dto.ts
    │   └── types/
    │       ├── request.types.ts
    │       ├── permission.types.ts
    │       └── i18n.types.ts
    ├── database/
    │   ├── database.module.ts
    │   ├── tenant-sequelize.service.ts
    │   ├── umzug.service.ts
    │   ├── base.entity.ts
    │   └── migrations/
    │       ├── shared/
    │       │   └── 20240101000000-create-tenants.ts
    │       └── tenant/
    │           ├── 20240101000001-create-users.ts
    │           ├── 20240101000002-create-roles-permissions.ts
    │           ├── 20240101000003-create-audit-logs.ts
    │           ├── 20240101000004-create-notifications.ts
    │           └── 20240101000005-create-fcm-tokens.ts
    ├── modules/
    │   ├── auth/
    │   │   ├── auth.module.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.service.ts
    │   │   ├── token-cache.service.ts
    │   │   ├── strategies/
    │   │   │   ├── jwt.strategy.ts
    │   │   │   └── refresh.strategy.ts
    │   │   └── dto/
    │   │       ├── login.dto.ts
    │   │       ├── register.dto.ts
    │   │       └── refresh-token.dto.ts
    │   ├── tenants/
    │   │   ├── tenants.module.ts
    │   │   ├── tenants.controller.ts
    │   │   ├── tenants.service.ts
    │   │   ├── tenant-provisioner.service.ts
    │   │   ├── dto/create-tenant.dto.ts
    │   │   └── entities/tenant.entity.ts
    │   ├── users/
    │   │   ├── users.module.ts
    │   │   ├── users.controller.ts
    │   │   ├── users.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-user.dto.ts
    │   │   │   └── update-user.dto.ts
    │   │   └── entities/
    │   │       ├── user.entity.ts
    │   │       └── user-fcm-token.entity.ts
    │   ├── roles/
    │   │   ├── roles.module.ts
    │   │   ├── roles.controller.ts
    │   │   ├── roles.service.ts
    │   │   ├── permissions.service.ts
    │   │   ├── permission-cache.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-role.dto.ts
    │   │   │   └── assign-permission.dto.ts
    │   │   └── entities/
    │   │       ├── role.entity.ts
    │   │       ├── permission.entity.ts
    │   │       ├── role-permission.entity.ts
    │   │       └── user-role.entity.ts
    │   ├── notifications/
    │   │   ├── notifications.module.ts
    │   │   ├── notifications.controller.ts
    │   │   ├── notifications.service.ts
    │   │   ├── fcm.processor.ts
    │   │   ├── sms.processor.ts
    │   │   ├── dto/send-notification.dto.ts
    │   │   └── entities/notification.entity.ts
    │   ├── chat/
    │   │   ├── chat.module.ts
    │   │   ├── chat.controller.ts
    │   │   ├── chat.service.ts
    │   │   ├── chat.gateway.ts
    │   │   ├── firestore-chat.service.ts
    │   │   └── dto/
    │   │       ├── create-conversation.dto.ts
    │   │       ├── send-message.dto.ts
    │   │       ├── add-reaction.dto.ts
    │   │       └── reply-message.dto.ts
    │   ├── hr/
    │   │   ├── hr.module.ts
    │   │   ├── employees/
    │   │   │   ├── employees.controller.ts
    │   │   │   ├── employees.service.ts
    │   │   │   ├── dto/
    │   │   │   │   ├── create-employee.dto.ts
    │   │   │   │   └── update-employee.dto.ts
    │   │   │   └── entities/employee.entity.ts
    │   │   ├── departments/
    │   │   │   ├── departments.controller.ts
    │   │   │   ├── departments.service.ts
    │   │   │   ├── dto/create-department.dto.ts
    │   │   │   └── entities/department.entity.ts
    │   │   └── leaves/
    │   │       ├── leaves.controller.ts
    │   │       ├── leaves.service.ts
    │   │       ├── dto/create-leave-request.dto.ts
    │   │       └── entities/leave-request.entity.ts
    │   ├── inventory/
    │   │   ├── inventory.module.ts
    │   │   ├── products/
    │   │   │   ├── products.controller.ts
    │   │   │   ├── products.service.ts
    │   │   │   ├── dto/
    │   │   │   │   ├── create-product.dto.ts
    │   │   │   │   └── update-product.dto.ts
    │   │   │   └── entities/
    │   │   │       ├── product.entity.ts
    │   │   │       └── product-category.entity.ts
    │   │   ├── warehouses/
    │   │   │   ├── warehouses.controller.ts
    │   │   │   ├── warehouses.service.ts
    │   │   │   ├── dto/create-warehouse.dto.ts
    │   │   │   └── entities/warehouse.entity.ts
    │   │   └── stock-movements/
    │   │       ├── stock-movements.controller.ts
    │   │       ├── stock-movements.service.ts
    │   │       ├── low-stock.processor.ts
    │   │       ├── dto/create-stock-movement.dto.ts
    │   │       └── entities/
    │   │           ├── stock-level.entity.ts
    │   │           └── stock-movement.entity.ts
    │   ├── crm/
    │   │   ├── crm.module.ts
    │   │   ├── contacts/
    │   │   │   ├── contacts.controller.ts
    │   │   │   ├── contacts.service.ts
    │   │   │   ├── dto/create-contact.dto.ts
    │   │   │   └── entities/contact.entity.ts
    │   │   ├── leads/
    │   │   │   ├── leads.controller.ts
    │   │   │   ├── leads.service.ts
    │   │   │   ├── dto/create-lead.dto.ts
    │   │   │   └── entities/lead.entity.ts
    │   │   └── sales-orders/
    │   │       ├── sales-orders.controller.ts
    │   │       ├── sales-orders.service.ts
    │   │       ├── dto/create-sales-order.dto.ts
    │   │       └── entities/
    │   │           ├── sales-order.entity.ts
    │   │           └── sales-order-line.entity.ts
    │   ├── purchasing/
    │   │   ├── purchasing.module.ts
    │   │   ├── vendors/
    │   │   │   ├── vendors.controller.ts
    │   │   │   ├── vendors.service.ts
    │   │   │   ├── dto/create-vendor.dto.ts
    │   │   │   └── entities/vendor.entity.ts
    │   │   └── purchase-orders/
    │   │       ├── purchase-orders.controller.ts
    │   │       ├── purchase-orders.service.ts
    │   │       ├── dto/create-purchase-order.dto.ts
    │   │       └── entities/
    │   │           ├── purchase-order.entity.ts
    │   │           └── purchase-order-line.entity.ts
    │   ├── projects/
    │   │   ├── projects.module.ts
    │   │   ├── projects/
    │   │   │   ├── projects.controller.ts
    │   │   │   ├── projects.service.ts
    │   │   │   ├── dto/create-project.dto.ts
    │   │   │   └── entities/project.entity.ts
    │   │   └── tasks/
    │   │       ├── tasks.controller.ts
    │   │       ├── tasks.service.ts
    │   │       ├── dto/create-task.dto.ts
    │   │       └── entities/task.entity.ts
    │   └── reporting/
    │       ├── reporting.module.ts
    │       ├── reporting.controller.ts
    │       ├── reporting.service.ts
    │       └── report-export.processor.ts
    ├── infrastructure/
    │   ├── cache/
    │   │   ├── cache.module.ts
    │   │   └── cache.service.ts
    │   ├── queues/
    │   │   ├── queues.module.ts
    │   │   └── queue.constants.ts
    │   ├── websockets/
    │   │   ├── events.gateway.ts
    │   │   └── events.module.ts
    │   ├── firebase/
    │   │   ├── firebase.module.ts
    │   │   └── firebase.service.ts
    │   ├── storage/
    │   │   ├── storage.module.ts
    │   │   └── storage.service.ts
    │   ├── mail/
    │   │   ├── mail.module.ts
    │   │   ├── mail.service.ts
    │   │   ├── mail.processor.ts
    │   │   └── templates/
    │   │       ├── welcome.hbs
    │   │       ├── invoice.hbs
    │   │       └── payslip.hbs
    │   ├── pdf/
    │   │   ├── pdf.module.ts
    │   │   └── pdf.service.ts
    │   └── audit/
    │       ├── audit.module.ts
    │       ├── audit.service.ts
    │       └── entities/audit-log.entity.ts
    ├── i18n/
    │   ├── en/
    │   │   ├── common.json
    │   │   ├── errors.json
    │   │   └── notifications.json
    │   └── ar/
    │       ├── common.json
    │       ├── errors.json
    │       └── notifications.json
    └── health/
        └── health.controller.ts
```

---

## Key Implementation Details

### main.ts must:
- Set global prefix `/api/v1`
- Enable URI versioning
- Apply `ValidationPipe` globally: `whitelist: true, forbidNonWhitelisted: true, transform: true`
- Apply `ResponseInterceptor` globally
- Apply `GlobalExceptionFilter` globally
- Bootstrap Swagger at `/api/v1/docs`
- Initialize Sentry before anything else
- Apply `helmet()` and `cors()`

### TenantSequelizeService must:
- Maintain a connection pool per tenant schema
- On each request set `search_path` to the tenant schema
- Expose `getSequelizeForTenant(slug: string): Sequelize`

### TenantProvisionerService must:
1. Insert into `public.tenants`
2. `CREATE SCHEMA IF NOT EXISTS tenant_{slug}`
3. Run all `migrations/tenant/` via UmzugService
4. Seed default roles: Admin, Manager, Employee with permissions for all modules
5. Create first admin user with bcrypt-hashed password
6. Return tenant + admin credentials

### PermissionsGuard must:
1. Read required permissions from `@Permissions()` decorator
2. Load from Redis cache `perm:{slug}:{userId}` (TTL 5m)
3. On cache miss: query DB → populate cache
4. Evaluate permission match (+ optional conditions for ABAC)

### ChatService + FirestoreChatService:
- `ChatController`: create conversation, list conversations, add/remove members
- `FirestoreChatService`: write messages, update read receipts, reactions, reply threading
- On new message: queue FCM via QUEUE_FCM for offline participants
- `ChatGateway`: emit `chat:message` to Socket.IO room as fallback

### NotificationsService must expose:
- `sendPush(userId, title, body, data)` → QUEUE_FCM → reads all user_fcm_tokens → firebase-admin
- `sendSms(phone, message)` → QUEUE_SMS → Twilio
- `sendEmail(to, template, context)` → QUEUE_MAIL → Nodemailer + Handlebars
- `sendInApp(userId, payload)` → insert notifications table → emit Socket.IO `notification:new`

### AuditInterceptor must:
- Intercept POST, PATCH, PUT, DELETE
- Capture before/after snapshots where applicable
- Write to audit_logs: tenantSlug, userId, action, module, recordId, before, after, ip, userAgent

---

## Environment Variables (.env.example)

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
SUPER_ADMIN_IPS=127.0.0.1

DB_HOST=localhost
DB_PORT=5432
DB_USER=erp_user
DB_PASS=secret
DB_NAME=erp_shared

REDIS_CACHE_HOST=localhost
REDIS_CACHE_PORT=6379

REDIS_QUEUE_HOST=localhost
REDIS_QUEUE_PORT=6380

JWT_SECRET=change-me
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-refresh
JWT_REFRESH_EXPIRES_IN=7d

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=erp-uploads
AWS_REGION=us-east-1

MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=
MAIL_FROM=noreply@erp.com

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

SENTRY_DSN=

DEFAULT_LANG=en
SUPPORTED_LANGS=en,ar
```

---

## Build Order (follow exactly)

1. `package.json`, `tsconfig.json`, `nest-cli.json`, `.eslintrc.js`, `.prettierrc`
2. `.env.example`, `docker-compose.yml`, `docker/Dockerfile`, `docker/Dockerfile.dev`
3. `src/config/` — all config files
4. `src/common/types/` — shared types
5. `src/common/dto/` — base DTOs
6. `src/database/base.entity.ts`
7. `src/database/migrations/` — all migration files
8. `src/database/database.module.ts`, `tenant-sequelize.service.ts`, `umzug.service.ts`
9. `src/infrastructure/` — cache, queues, firebase, storage, mail, pdf, audit, websockets
10. `src/common/` — decorators, guards, interceptors, filters, pipes, middleware
11. `src/i18n/` — all JSON translation files
12. `src/modules/auth/`
13. `src/modules/tenants/`
14. `src/modules/users/`
15. `src/modules/roles/`
16. `src/modules/notifications/`
17. `src/modules/chat/`
18. `src/modules/hr/`
19. `src/modules/inventory/`
20. `src/modules/crm/`
21. `src/modules/purchasing/`
22. `src/modules/projects/`
23. `src/modules/reporting/`
24. `src/health/health.controller.ts`
25. `src/app.module.ts`
26. `src/main.ts`
27. `.github/workflows/ci.yml` and `deploy.yml`

---

## What is NOT included yet (next phase)

The following will be added in a separate prompt after this foundation is verified:
- Accounting & Finance (chart of accounts, journal entries, invoices, payments)
- Payroll processing (payroll runs, payslips, PDF generation)
- Reporting & Analytics dashboards (P&L, balance sheet, cash flow)

Do not create stubs or placeholder files for these. Leave them out entirely.