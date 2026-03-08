# ERP Backend — Project Intelligence for Claude Code

> This file is the single source of truth for all architectural decisions, coding standards,
> and patterns. Follow every rule exactly. Never deviate without a documented reason.

---

## 1. Project Overview

A production-ready, multi-tenant ERP backend for SMEs targeting the Saudi/Middle Eastern market.
Supports Arabic and English with full bilingual data storage and API responses.

**Target:** SME companies (B2B)
**Region:** Saudi Arabia / Middle East
**Languages:** Arabic (ar) + English (en)
**Compliance:** ZATCA e-invoicing, Saudi Labor Law payroll

---

## 2. Complete Tech Stack

| Concern | Choice |
|---|---|
| Framework | NestJS 10, single app |
| Language | TypeScript 5, strict mode |
| Database | PostgreSQL 16, schema-per-tenant |
| ORM | sequelize + sequelize-typescript |
| Migrations | Umzug 3, TypeScript migration files |
| Cache | Redis instance 1 (port 6379) via cache-manager-ioredis-yet |
| Queue | BullMQ + Redis instance 2 (port 6380, dedicated) |
| Real-time | Socket.IO via @nestjs/websockets |
| Chat Storage | Firebase Firestore |
| Push Notifications | FCM via firebase-admin, dispatched through BullMQ |
| SMS | Twilio, dispatched through BullMQ |
| In-app Notifications | PostgreSQL (stored) + Socket.IO (real-time delivery) |
| Email | Nodemailer + Handlebars templates via BullMQ |
| PDF | Puppeteer |
| File Storage | AWS S3 via @aws-sdk/client-s3 (abstracted, swappable) |
| i18n Messages | nestjs-i18n, driven by Accept-Language header |
| i18n Data | Separate `_en` / `_ar` columns per translatable field |
| Auth | JWT (15m) + Refresh Tokens (7d) |
| Authorization | RBAC + permissions per module, ABAC-ready via conditions JSONB |
| Precision Math | decimal.js — used for ALL financial calculations |
| API Versioning | URL-based: /api/v1/ |
| API Docs | Swagger at /api/v1/docs |
| Logging | Winston + nest-winston, structured JSON |
| Error Tracking | Sentry (@sentry/node) |
| Security | Helmet, CORS, @nestjs/throttler per-tenant, IP whitelist guard |
| Config | @nestjs/config + .env per environment |
| Testing | Jest + Supertest |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## 3. Project Structure

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
├── nest-cli.json
├── tsconfig.json
├── package.json
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── config/
    │   ├── app.config.ts
    │   ├── database.config.ts
    │   ├── redis-cache.config.ts
    │   ├── redis-queue.config.ts
    │   ├── jwt.config.ts
    │   ├── firebase.config.ts
    │   └── storage.config.ts
    │
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
    │   │   └── admin-ip.guard.ts
    │   ├── interceptors/
    │   │   ├── response.interceptor.ts
    │   │   ├── audit.interceptor.ts
    │   │   └── tenant.interceptor.ts
    │   ├── filters/
    │   │   └── global-exception.filter.ts
    │   ├── pipes/
    │   │   └── validation.pipe.ts
    │   ├── middleware/
    │   │   ├── tenant-resolver.middleware.ts
    │   │   └── logger.middleware.ts
    │   ├── dto/
    │   │   ├── pagination.dto.ts
    │   │   ├── dropdown-query.dto.ts
    │   │   └── base-response.dto.ts
    │   ├── enums/
    │   │   ├── language.enum.ts
    │   │   └── status.enum.ts
    │   └── interfaces/
    │       ├── request.interface.ts
    │       ├── pagination.interface.ts
    │       ├── repository.interface.ts
    │       └── audit.interface.ts
    │
    ├── database/
    │   ├── database.module.ts
    │   ├── tenant-sequelize.service.ts
    │   ├── umzug.service.ts
    │   ├── base.entity.ts
    │   ├── base.repository.ts
    │   ├── entities/                        ← ALL entities live here
    │   │   ├── admin.entity.ts
    │   │   ├── tenant.entity.ts
    │   │   ├── user.entity.ts
    │   │   ├── user-fcm-token.entity.ts
    │   │   ├── role.entity.ts
    │   │   ├── permission.entity.ts
    │   │   ├── role-permission.entity.ts
    │   │   ├── user-role.entity.ts
    │   │   ├── notification.entity.ts
    │   │   ├── audit-log.entity.ts
    │   │   ├── employee.entity.ts
    │   │   ├── department.entity.ts
    │   │   ├── leave-request.entity.ts
    │   │   ├── product.entity.ts
    │   │   ├── product-category.entity.ts
    │   │   ├── warehouse.entity.ts
    │   │   ├── stock-level.entity.ts
    │   │   ├── stock-movement.entity.ts
    │   │   ├── contact.entity.ts
    │   │   ├── lead.entity.ts
    │   │   ├── sales-order.entity.ts
    │   │   ├── sales-order-line.entity.ts
    │   │   ├── vendor.entity.ts
    │   │   ├── purchase-order.entity.ts
    │   │   ├── purchase-order-line.entity.ts
    │   │   ├── project.entity.ts
    │   │   └── task.entity.ts
    │   └── migrations/
    │       ├── shared/
    │       │   ├── 20240101000000-create-admins.ts
    │       │   └── 20240101000001-create-tenants.ts
    │       └── tenant/
    │           ├── 20240101000002-create-users.ts
    │           ├── 20240101000003-create-roles-permissions.ts
    │           ├── 20240101000004-create-audit-logs.ts
    │           ├── 20240101000005-create-notifications.ts
    │           ├── 20240101000006-create-fcm-tokens.ts
    │           ├── 20240101000007-create-employees.ts
    │           ├── 20240101000008-create-products.ts
    │           ├── 20240101000009-create-stock.ts
    │           ├── 20240101000010-create-contacts.ts
    │           ├── 20240101000011-create-sales-orders.ts
    │           ├── 20240101000012-create-vendors.ts
    │           ├── 20240101000013-create-purchase-orders.ts
    │           └── 20240101000014-create-projects.ts
    │
    ├── shared/                              ← global shared services (@Global module)
    │   ├── shared.module.ts
    │   ├── services/
    │   │   ├── notification.service.ts
    │   │   ├── storage.service.ts
    │   │   ├── pdf.service.ts
    │   │   ├── currency.service.ts
    │   │   ├── tax.service.ts
    │   │   ├── user-lookup.service.ts
    │   │   ├── audit.service.ts
    │   │   ├── status-transition.service.ts
    │   │   ├── date.service.ts
    │   │   └── financial.service.ts
    │   └── interfaces/
    │       ├── notification.interface.ts
    │       ├── status-transition.interface.ts
    │       └── financial.interface.ts
    │
    ├── common/utils/
    │   ├── math/
    │   │   └── decimal.util.ts
    │   ├── financial/
    │   │   ├── tax.util.ts
    │   │   ├── discount.util.ts
    │   │   ├── invoice.util.ts
    │   │   ├── payroll.util.ts
    │   │   ├── interest.util.ts
    │   │   └── currency.util.ts
    │   └── date/
    │       ├── hijri.util.ts
    │       ├── fiscal.util.ts
    │       ├── working-days.util.ts
    │       └── date-range.util.ts
    │
    ├── modules/
    │   ├── auth/
    │   │   ├── controllers/
    │   │   │   └── auth.controller.ts
    │   │   ├── services/
    │   │   │   ├── auth.service.ts
    │   │   │   └── token-cache.service.ts
    │   │   ├── strategies/
    │   │   │   ├── jwt.strategy.ts
    │   │   │   └── refresh.strategy.ts
    │   │   ├── dto/
    │   │   │   ├── login.dto.ts
    │   │   │   ├── register.dto.ts
    │   │   │   └── refresh-token.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── auth.interface.ts
    │   │   │   └── auth.enum.ts
    │   │   └── auth.module.ts
    │   │
    │   ├── admins/
    │   │   ├── controllers/
    │   │   │   └── admins.controller.ts
    │   │   ├── services/
    │   │   │   └── admins.service.ts
    │   │   ├── repositories/
    │   │   │   └── admins.repository.ts
    │   │   ├── dto/
    │   │   │   └── create-admin.dto.ts
    │   │   ├── interfaces/
    │   │   │   └── admin.interface.ts
    │   │   └── admins.module.ts
    │   │
    │   ├── tenants/
    │   │   ├── controllers/
    │   │   │   └── tenants.controller.ts
    │   │   ├── services/
    │   │   │   ├── tenants.service.ts
    │   │   │   └── tenant-provisioner.service.ts
    │   │   ├── repositories/
    │   │   │   └── tenants.repository.ts
    │   │   ├── dto/
    │   │   │   └── create-tenant.dto.ts
    │   │   ├── interfaces/
    │   │   │   └── tenant.interface.ts
    │   │   └── tenants.module.ts
    │   │
    │   ├── users/
    │   │   ├── controllers/
    │   │   │   └── users.controller.ts
    │   │   ├── services/
    │   │   │   └── users.service.ts
    │   │   ├── repositories/
    │   │   │   ├── users.repository.ts
    │   │   │   └── user-fcm-token.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-user.dto.ts
    │   │   │   └── update-user.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── user.interface.ts
    │   │   │   └── user.enum.ts
    │   │   └── users.module.ts
    │   │
    │   ├── roles/
    │   │   ├── controllers/
    │   │   │   └── roles.controller.ts
    │   │   ├── services/
    │   │   │   ├── roles.service.ts
    │   │   │   ├── permissions.service.ts
    │   │   │   └── permission-cache.service.ts
    │   │   ├── repositories/
    │   │   │   ├── roles.repository.ts
    │   │   │   └── permissions.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-role.dto.ts
    │   │   │   └── assign-permission.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── role.interface.ts
    │   │   │   └── permission.enum.ts
    │   │   └── roles.module.ts
    │   │
    │   ├── notifications/
    │   │   ├── controllers/
    │   │   │   └── notifications.controller.ts
    │   │   ├── services/
    │   │   │   └── notifications.service.ts
    │   │   ├── processors/
    │   │   │   ├── fcm.processor.ts
    │   │   │   └── sms.processor.ts
    │   │   ├── dto/
    │   │   │   └── send-notification.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── notification.interface.ts
    │   │   │   └── notification.enum.ts
    │   │   └── notifications.module.ts
    │   │
    │   ├── chat/
    │   │   ├── controllers/
    │   │   │   └── chat.controller.ts
    │   │   ├── services/
    │   │   │   ├── chat.service.ts
    │   │   │   └── firestore-chat.service.ts
    │   │   ├── gateways/
    │   │   │   └── chat.gateway.ts
    │   │   ├── dto/
    │   │   │   ├── create-conversation.dto.ts
    │   │   │   ├── send-message.dto.ts
    │   │   │   ├── add-reaction.dto.ts
    │   │   │   └── reply-message.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── chat.interface.ts
    │   │   │   └── chat.enum.ts
    │   │   └── chat.module.ts
    │   │
    │   ├── hr/
    │   │   ├── controllers/
    │   │   │   ├── employees.controller.ts
    │   │   │   ├── departments.controller.ts
    │   │   │   └── leaves.controller.ts
    │   │   ├── services/
    │   │   │   ├── employees.service.ts
    │   │   │   ├── departments.service.ts
    │   │   │   └── leaves.service.ts
    │   │   ├── repositories/
    │   │   │   ├── employees.repository.ts
    │   │   │   ├── departments.repository.ts
    │   │   │   └── leaves.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-employee.dto.ts
    │   │   │   ├── update-employee.dto.ts
    │   │   │   └── create-leave-request.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── employee.interface.ts
    │   │   │   └── employee.enum.ts
    │   │   └── hr.module.ts
    │   │
    │   ├── inventory/
    │   │   ├── controllers/
    │   │   │   ├── products.controller.ts
    │   │   │   ├── categories.controller.ts
    │   │   │   ├── warehouses.controller.ts
    │   │   │   └── stock-movements.controller.ts
    │   │   ├── services/
    │   │   │   ├── products.service.ts
    │   │   │   ├── categories.service.ts
    │   │   │   ├── warehouses.service.ts
    │   │   │   └── stock-movements.service.ts
    │   │   ├── repositories/
    │   │   │   ├── products.repository.ts
    │   │   │   ├── categories.repository.ts
    │   │   │   ├── warehouses.repository.ts
    │   │   │   ├── stock-levels.repository.ts
    │   │   │   └── stock-movements.repository.ts
    │   │   ├── processors/
    │   │   │   └── low-stock.processor.ts
    │   │   ├── dto/
    │   │   │   ├── create-product.dto.ts
    │   │   │   ├── update-product.dto.ts
    │   │   │   └── create-stock-movement.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── product.interface.ts
    │   │   │   └── inventory.enum.ts
    │   │   └── inventory.module.ts
    │   │
    │   ├── crm/
    │   │   ├── controllers/
    │   │   │   ├── contacts.controller.ts
    │   │   │   ├── leads.controller.ts
    │   │   │   └── sales-orders.controller.ts
    │   │   ├── services/
    │   │   │   ├── contacts.service.ts
    │   │   │   ├── leads.service.ts
    │   │   │   └── sales-orders.service.ts
    │   │   ├── repositories/
    │   │   │   ├── contacts.repository.ts
    │   │   │   ├── leads.repository.ts
    │   │   │   └── sales-orders.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-contact.dto.ts
    │   │   │   ├── create-lead.dto.ts
    │   │   │   └── create-sales-order.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── crm.interface.ts
    │   │   │   └── crm.enum.ts
    │   │   └── crm.module.ts
    │   │
    │   ├── purchasing/
    │   │   ├── controllers/
    │   │   │   ├── vendors.controller.ts
    │   │   │   └── purchase-orders.controller.ts
    │   │   ├── services/
    │   │   │   ├── vendors.service.ts
    │   │   │   └── purchase-orders.service.ts
    │   │   ├── repositories/
    │   │   │   ├── vendors.repository.ts
    │   │   │   └── purchase-orders.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-vendor.dto.ts
    │   │   │   └── create-purchase-order.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── purchasing.interface.ts
    │   │   │   └── purchasing.enum.ts
    │   │   └── purchasing.module.ts
    │   │
    │   ├── projects/
    │   │   ├── controllers/
    │   │   │   ├── projects.controller.ts
    │   │   │   └── tasks.controller.ts
    │   │   ├── services/
    │   │   │   ├── projects.service.ts
    │   │   │   └── tasks.service.ts
    │   │   ├── repositories/
    │   │   │   ├── projects.repository.ts
    │   │   │   └── tasks.repository.ts
    │   │   ├── dto/
    │   │   │   ├── create-project.dto.ts
    │   │   │   └── create-task.dto.ts
    │   │   ├── interfaces/
    │   │   │   ├── project.interface.ts
    │   │   │   └── project.enum.ts
    │   │   └── projects.module.ts
    │   │
    │   └── reporting/
    │       ├── controllers/
    │       │   └── reporting.controller.ts
    │       ├── services/
    │       │   └── reporting.service.ts
    │       ├── processors/
    │       │   └── report-export.processor.ts
    │       ├── dto/
    │       │   └── generate-report.dto.ts
    │       ├── interfaces/
    │       │   ├── report.interface.ts
    │       │   └── report.enum.ts
    │       └── reporting.module.ts
    │
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
    │   ├── mail/
    │   │   ├── mail.module.ts
    │   │   ├── mail.service.ts
    │   │   ├── mail.processor.ts
    │   │   └── templates/
    │   │       ├── welcome.hbs
    │   │       ├── invoice.hbs
    │   │       └── payslip.hbs
    │   └── pdf/
    │       ├── pdf.module.ts
    │       └── pdf.service.ts
    │
    ├── i18n/
    │   ├── en/
    │   │   ├── common.json
    │   │   ├── errors.json
    │   │   └── notifications.json
    │   └── ar/
    │       ├── common.json
    │       ├── errors.json
    │       └── notifications.json
    │
    └── health/
        └── health.controller.ts
```

---

## 4. Multi-Tenancy

**Strategy:** Schema-per-tenant on PostgreSQL.

```
public schema
├── admins       ← platform admins
└── tenants      ← company registry

tenant_{slug} schema (one per company)
├── users, roles, permissions ...
├── employees, departments ...
├── products, stock ...
└── ... all other tables
```

**Request flow:**
```
Request
  → TenantResolverMiddleware   extract slug from JWT
  → TenantSequelizeService     SET search_path = tenant_{slug}
  → Controller / Service       all queries auto-scoped to tenant
```

**Tenant provisioning flow:**
```
POST /api/v1/tenants
  1. Insert into public.tenants
  2. CREATE SCHEMA IF NOT EXISTS tenant_{slug}
  3. Run all tenant/ migrations via UmzugService
  4. Seed default roles: Admin, Manager, Employee
  5. Seed permissions for all modules
  6. Create first admin user (bcrypt password)
  7. Return tenant + admin credentials
```

---

## 5. Base Entity

All entities **must** extend `BaseEntity`:

```typescript
id:        UUID, primary key, auto-generated
createdAt: Date
updatedAt: Date
deletedAt: Date | null   // soft delete — paranoid: true on ALL models
createdBy: UUID | null   // auto-set by AuditInterceptor
updatedBy: UUID | null   // auto-set by AuditInterceptor
version:   number        // optimistic locking on financial entities
```

---

## 6. Module Structure Standard

Every module **must** follow this exact folder structure:

```
module-name/
├── controllers/     ← one controller per resource
├── services/        ← one service per resource
├── repositories/    ← one repository per entity
├── dto/             ← request DTOs only
├── interfaces/      ← ALL interfaces, enums, types for this module
└── module-name.module.ts
```

- Entities live in `src/database/entities/` — **never** inside a module folder
- Cross-module shared enums → `src/common/enums/`
- Cross-module shared interfaces → `src/common/interfaces/`
- Never define enums or interfaces inline inside a service or controller

---

## 7. Repository Pattern

### Rules
- Services **never** import Sequelize models directly — all DB access goes through repositories
- `Op`, `Sequelize`, `Transaction` are used **only** inside repository files
- Never write raw SQL strings — always use Sequelize ORM methods (`findAll`, `findOne`, `create`, `update`, `destroy`, `bulkCreate` etc.)
- Raw SQL via `rawQuery()` is an **absolute last resort** — only for queries Sequelize cannot express (e.g. recursive CTEs, window functions)

### BaseRepository provides:

```typescript
// All operations accept QueryOptions: { where, include, attributes, order, transaction, paranoid }

findAll(options)          // paginated + filtered + searched + sorted
findById(id, options)     // throws 404 if not found
findByIdOrNull(id)        // returns null if not found
findOne(options)          // find by condition, nullable
findOneOrFail(options)    // find by condition, throws 404
findAllRaw(options)       // no pagination — for dropdowns / exports
create(data, options)     // auto sets createdBy/updatedBy
update(id, data, options) // auto sets updatedBy, uses SELECT FOR UPDATE
softDelete(id, options)   // sets deletedAt
hardDelete(id, options)   // permanent, force: true
restore(id, options)      // undo soft delete
bulkCreate(options)       // insert many, supports updateOnDuplicate
bulkUpdate(options)       // update many by condition
count(options)            // count matching records
exists(where)             // boolean check
findOrCreate(where, defaults, options)
rawQuery(sql, replacements, transaction)  // LAST RESORT ONLY
```

### Bilingual search (automatic)
Pass `searchFields: ['name', 'description']` — the repository automatically searches both `name_en`/`name_ar` and `description_en`/`description_ar` using `Op.iLike`.

### Bilingual sort (automatic)
Pass `sortBy: 'name'` + `lang: 'ar'` — the repository automatically sorts by `name_ar`.

---

## 8. Transaction Standard

**Always use explicit async/await transaction pattern:**

```typescript
// ✅ Correct pattern
const transaction = await this.sequelize.transaction();
try {
  const order = await this.orderRepo.create(params.order, { transaction, auditContext });
  await this.orderLineRepo.bulkCreate({ data: params.lines, transaction, auditContext });
  await this.stockRepo.update(productId, { quantity }, { transaction, auditContext });
  await transaction.commit();
  return order;
} catch (error) {
  await transaction.rollback();
  throw error;
}

// ❌ Never use callback style
this.repo.withTransaction(async (transaction) => { ... })
```

**Must use transactions for:**
- Any write touching more than one table
- All status transitions with side effects
- All payroll runs
- All invoice/order creation
- All stock movements
- All bulk operations

---

## 9. i18n — Bilingual Data

### Data storage: separate columns (never JSONB)
```typescript
// ✅ Correct
name_en: string;
name_ar: string;
description_en: string;
description_ar: string;

// ❌ Never
name: { en: string; ar: string };
```

### Language resolution order
```typescript
const lang =
  req.user?.preferredLang           // 1. user profile (from JWT)
  ?? req.headers['accept-language'] // 2. request header
  ?? 'en';                          // 3. default
```

Store `preferredLang` on `users` table. Include in JWT payload — no extra DB lookup needed per request.

### Response flattening
`ResponseInterceptor` automatically flattens `_en`/`_ar` fields to plain `name` based on user lang before sending. **Never return `name_en`/`name_ar` raw to clients.**

### Search: always search both columns
```typescript
// Searching 'name' automatically queries name_en AND name_ar
{ [Op.or]: [
  { name_en: { [Op.iLike]: `%${query}%` } },
  { name_ar: { [Op.iLike]: `%${query}%` } },
]}
```

### Filters: always use raw enum keys
```
GET /products?status=draft     ✅ raw enum key
GET /products?status=مسودة     ❌ never translated value
```

### Static labels: translate via nestjs-i18n
```typescript
// DB stores raw enum key
status: 'draft'

// Service translates before returning
status: this.i18n.t(`common.status.${record.status}`, { lang })
```

---

## 10. Enums, Types & Interfaces Standard

```typescript
// ✅ Always define enums for statuses
export enum InvoiceStatus {
  DRAFT     = 'draft',
  APPROVED  = 'approved',
  PAID      = 'paid',
  CANCELLED = 'cancelled',
}

// ✅ Always use Record for mappings — never switch/case
const statusMap: Record<ExternalStatus, InvoiceStatus> = {
  [ExternalStatus.PAID]:      InvoiceStatus.PAID,
  [ExternalStatus.FAILED]:    InvoiceStatus.CANCELLED,
  [ExternalStatus.INITIATED]: InvoiceStatus.DRAFT,
};
return statusMap[externalStatus] ?? InvoiceStatus.DRAFT;

// ❌ Never use switch/case for value mapping
switch (status) {
  case 'paid': return 'paid';
  ...
}
```

- All enums, interfaces, and types for a module live in `module/interfaces/`
- Never use magic strings anywhere in the codebase
- Never define types inline inside service or controller files

---

## 11. Function Parameters Standard

Any function with **more than 3 parameters** must use a typed params object:

```typescript
// ✅ Correct
async createPayroll(params: CreatePayrollParams): Promise<PayrollRun> { }

interface CreatePayrollParams {
  employeeId:        string;
  periodStart:       Date;
  periodEnd:         Date;
  basicSalary:       number;
  housingAllowance:  number;
  auditContext:      AuditContext;
  transaction?:      Transaction;
}

// ❌ Never
async createPayroll(
  employeeId: string, periodStart: Date, periodEnd: Date,
  basicSalary: number, housingAllowance: number
) { }
```

Exception: single-param methods (`findById(id)`, `softDelete(id)`) stay as-is.

---

## 12. HTTP Methods Standard

```
GET     → read / list resources
POST    → create a resource OR trigger an action
PUT     → full resource update (replace entire object)
PATCH   → specific field or state change only
DELETE  → remove a resource
```

```typescript
PUT    /invoices/:id          // update invoice fields
PATCH  /invoices/:id/approve  // status transition only
PATCH  /invoices/:id/cancel   // status transition only
PATCH  /users/:id/password    // single field change
POST   /payroll/run           // trigger an action
```

**Never use PATCH for general updates — that is PUT's job.**

---

## 13. Dropdown Standard

Every resource controller **must** have a `/dropdown` endpoint:

```typescript
// URL pattern
GET /api/v1/products/dropdown
GET /api/v1/categories/dropdown?search=off
GET /api/v1/employees/dropdown?search=ahmed

// Query params (all optional)
?search=   searches both _en and _ar columns
?limit=    default 50, max 100

// Response (no pagination meta)
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "id": "uuid", "name": "كرسي مكتب", "code": "SKU-001" }
  ],
  "timestamp": "...",
  "requestId": "uuid"
}
```

**Rules:**
- Always return active records only (no deleted, no inactive)
- `name` is always resolved to user's language — never return `name_en`/`name_ar` raw
- `/dropdown` route **must** be declared before `/:id` in the controller to avoid route conflicts
- No pagination — flat array, max 100 records

---

## 14. API Response Standard

### Success — single resource
```json
{
  "success": true,
  "statusCode": 200,
  "data": { },
  "timestamp": "2025-03-06T10:00:00Z",
  "requestId": "uuid-v4",
  "lang": "ar"
}
```

### Success — paginated list
```json
{
  "success": true,
  "statusCode": 200,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2025-03-06T10:00:00Z",
  "requestId": "uuid-v4",
  "lang": "ar"
}
```

### Error
```json
{
  "success": false,
  "statusCode": 404,
  "error": {
    "code": "INVOICE_NOT_FOUND",
    "message": "الفاتورة غير موجودة",
    "details": null
  },
  "timestamp": "2025-03-06T10:00:00Z",
  "requestId": "uuid-v4"
}
```

### Validation error (422)
```json
{
  "success": false,
  "statusCode": 422,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "البيانات المدخلة غير صحيحة",
    "details": [
      { "field": "email",  "message": "البريد الإلكتروني غير صالح" },
      { "field": "amount", "message": "المبلغ يجب أن يكون أكبر من صفر" }
    ]
  },
  "timestamp": "2025-03-06T10:00:00Z",
  "requestId": "uuid-v4"
}
```

### HTTP Status Code Map

| Code | When |
|---|---|
| `200` | Successful GET, PUT, PATCH |
| `201` | Successful POST (resource created) |
| `204` | Successful DELETE (no body) |
| `400` | Bad request / business rule violation |
| `401` | Unauthenticated |
| `403` | Unauthorized (valid token, no permission) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, SKU etc.) |
| `422` | Validation error |
| `500` | Unexpected server error |

### Error code convention
```
SCREAMING_SNAKE_CASE, module-prefixed:

VALIDATION_ERROR / UNAUTHORIZED / FORBIDDEN / NOT_FOUND

INVOICE_NOT_FOUND / INVOICE_ALREADY_APPROVED / INVOICE_CANNOT_BE_DELETED
PRODUCT_SKU_DUPLICATE / PRODUCT_INSUFFICIENT_STOCK
EMPLOYEE_NOT_FOUND / PAYROLL_PERIOD_ALREADY_PROCESSED
PAYMENT_FAILED / PAYMENT_ALREADY_REFUNDED
```

**Rules:**
- ALL responses go through `ResponseInterceptor` — never return raw objects from controllers
- ALL errors go through `GlobalExceptionFilter` — never throw raw errors from controllers
- Stack traces included in `NODE_ENV=development` only — never in production
- Error messages always translated via nestjs-i18n
- `requestId` generated in middleware, attached to `req`, included in all responses and logs

---

## 15. Shared Services

`SharedModule` is `@Global()` — imported once in `AppModule`, available everywhere.

```
shared/services/
├── notification.service.ts    sendPush / sendSms / sendEmail / sendInApp
├── storage.service.ts         upload / download / delete files
├── pdf.service.ts             generate any PDF via Puppeteer
├── currency.service.ts        convert amounts + fetch live rates
├── tax.service.ts             calculate tax + build tax breakdown
├── user-lookup.service.ts     get user/permissions without circular dep
├── audit.service.ts           write audit logs from anywhere
├── status-transition.service.ts  validate + apply status changes
├── date.service.ts            hijri/gregorian + fiscal + working days
└── financial.service.ts       invoice totals, payroll, rounding
```

**Rules:**
- Feature modules **never** import other feature modules directly
- If module A needs something from module B → extract it to `SharedModule`
- `SharedModule` **never** imports any feature module
- Never duplicate shared logic across modules

---

## 16. Financial & Date Utilities

### Precision arithmetic — decimal.js (mandatory)
```typescript
// ✅ Always
import { DecimalUtil } from '@/common/utils/math/decimal.util';
const total = DecimalUtil.add(subtotal, taxAmount);

// ❌ Never
const total = subtotal + taxAmount; // floating point errors
```

Every financial calculation **must** use `decimal.util.ts`. Never use native JS arithmetic on money values.

### Rounding: Round Half Up
`1.235 → 1.24` — consistent across all financial outputs.

### Financial utilities
```
decimal.util.ts      add, subtract, multiply, divide, roundHalfUp, toNumber, toDecimal
tax.util.ts          calculateTax, calculateTaxInclusive, applyMultipleTaxes, buildTaxBreakdown
discount.util.ts     applyPercentageDiscount, applyFixedDiscount, applyDiscounts, validateDiscount
invoice.util.ts      calculateInvoiceTotals, buildZATCAInvoiceLine, validateZATCAInvoice
payroll.util.ts      calculateGrossSalary, calculateGOSI, calculateOvertime,
                     calculateEndOfService, calculateNetSalary, buildPayslipBreakdown
interest.util.ts     calculateLatePaymentInterest, calculateCompoundInterest
currency.util.ts     convertAmount, getExchangeRate, formatAmount
```

### Payroll components (Saudi Labor Law)
```
Basic salary
Housing allowance
Transportation allowance
GOSI: Saudi nationals 11% (employee 9.75% + employer 1.25%) / Expats 2% employer only
Overtime: 1.5x regular / 2x holidays
End of service (gratuity): 0.5 month per year (1–5 yrs) / 1 month per year (5+ yrs)
Income tax deduction: configurable per employee nationality
```

### Date utilities
```
hijri.util.ts          toHijri, toGregorian, formatHijri (en/ar)
fiscal.util.ts         getCurrentFiscalYear, getCurrentFiscalPeriod, getFiscalYearDateRange
working-days.util.ts   getWorkingDaysBetween, addWorkingDays, isWorkingDay
                       Saudi weekend = Friday + Saturday
date-range.util.ts     thisMonth, lastMonth, thisQuarter, lastQuarter,
                       thisYear, lastYear, customRange, toHijriRange
```

### Invoice standard
Both ZATCA-compliant and standard invoice calculation supported. Tax applied after discount on each line per ZATCA spec.

### Currency
Multi-currency with dynamic base currency per tenant. Live rates fetched from external API on demand.

---

## 17. Permission System

```typescript
// RBAC now, ABAC-ready later
permission = {
  module:     'invoices',
  action:     'approve',
  conditions: { ownedBy: 'self', maxAmount: 10000 }  // optional ABAC
}

// Usage
@Permissions('invoices:approve')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Patch(':id/approve')
approveInvoice(@Param('id') id: string) { }
```

Permission cache key: `perm:{tenantSlug}:{userId}` — TTL 5 minutes.

---

## 18. BullMQ Queues

```typescript
// queue.constants.ts
export const QUEUES = {
  MAIL:      'erp:mail',
  FCM:       'erp:fcm',
  SMS:       'erp:sms',
  PAYROLL:   'erp:payroll',
  INVOICES:  'erp:invoices',
  REPORTS:   'erp:reports',
  INVENTORY: 'erp:inventory',
} as const;
```

---

## 19. WebSocket Events

```
notification:new          in-app notification pushed
chat:message              new chat message (Firestore fallback)
task:updated              task status/assignee changed
invoice:approved          invoice workflow update
stock:low                 inventory alert
payroll:completed         payroll run done
report:ready              async export finished

Rooms:
tenant:{slug}:user:{userId}      personal
tenant:{slug}:role:{roleName}    role-wide
tenant:{slug}:group:{groupId}    group chat
```

---

## 20. Chat (Firestore)

```
tenants/{tenantSlug}/conversations/{conversationId}
  type: 'direct' | 'support' | 'group'
  participants: string[]
  lastMessage: { text, senderId, timestamp }
  unreadCount: { [userId]: number }

tenants/{tenantSlug}/conversations/{conversationId}/messages/{messageId}
  senderId, text, attachments[], reactions{}, replyTo,
  readBy{}, deliveredTo{}, createdAt, deletedAt
```

---

## 21. Security

```typescript
app.use(helmet())
app.enableCors({ origin: allowedOrigins })
@Throttle({ default: { limit: 100, ttl: 60000 } })   // per tenant
@UseGuards(AdminIpGuard)                               // reads ADMIN_IPS from env
```

---

## 22. main.ts Requirements

```typescript
// Must do all of the following:
Sentry.init(...)                          // first, before anything
app.setGlobalPrefix('api/v1')
app.enableVersioning({ type: URI })
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))
app.useGlobalInterceptors(new ResponseInterceptor())
app.useGlobalFilters(new GlobalExceptionFilter())
app.use(helmet())
app.enableCors({ origin: allowedOrigins })
SwaggerModule.setup('api/v1/docs', app, document)
```

---

## 23. Environment Variables

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
ADMIN_IPS=127.0.0.1

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

## 24. Build Order

Follow this exact order to respect dependencies:

```
1.  package.json, tsconfig.json, nest-cli.json, .eslintrc.js, .prettierrc
2.  .env.example, docker-compose.yml, docker/Dockerfile, docker/Dockerfile.dev
3.  src/config/              all config files
4.  src/common/interfaces/   shared types first
5.  src/common/enums/        shared enums
6.  src/common/dto/          base DTOs
7.  src/common/utils/        all financial + date utilities
8.  src/database/base.entity.ts
9.  src/database/entities/   all entities
10. src/database/migrations/  all migration files
11. src/database/             database.module, tenant-sequelize, umzug, base.repository
12. src/infrastructure/       cache, queues, firebase, mail, pdf, websockets
13. src/shared/               SharedModule + all shared services
14. src/common/               decorators, guards, interceptors, filters, pipes, middleware
15. src/i18n/                 all JSON translation files
16. src/modules/auth/
17. src/modules/admins/
18. src/modules/tenants/
19. src/modules/users/
20. src/modules/roles/
21. src/modules/notifications/
22. src/modules/chat/
23. src/modules/hr/
24. src/modules/inventory/
25. src/modules/crm/
26. src/modules/purchasing/
27. src/modules/projects/
28. src/modules/reporting/
29. src/health/
30. src/app.module.ts
31. src/main.ts
32. .github/workflows/ci.yml + deploy.yml
```

---

## 25. What Is NOT Included Yet (Phase 2)

The following modules will be added in a separate prompt after Phase 1 is complete and verified:

- Accounting & Finance (chart of accounts, journal entries, invoices, payments)
- Payroll processing (payroll runs, payslips, PDF generation)
- Reporting & Analytics dashboards (P&L, balance sheet, cash flow)

**Do not create stubs or placeholder files for these. Leave them out entirely.**