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
├── commitlint.config.js
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── config/
    │   ├── index.ts
    │   ├── app.config.ts
    │   ├── database.config.ts
    │   ├── redis-cache.config.ts
    │   ├── redis-queue.config.ts
    │   ├── jwt.config.ts
    │   ├── firebase.config.ts
    │   ├── storage.config.ts
    │   ├── mail.config.ts
    │   ├── sms.config.ts
    │   ├── mongodb.config.ts
    │   ├── payment.config.ts
    │   ├── encryption.config.ts
    │   ├── otel.config.ts
    │   ├── outbox.config.ts
    │   ├── webhook.config.ts
    │   └── idempotency.config.ts
    │
    ├── common/
    │   ├── decorators/
    │   │   ├── current-user.decorator.ts
    │   │   ├── tenant.decorator.ts
    │   │   ├── permissions.decorator.ts
    │   │   ├── public.decorator.ts
    │   │   ├── cache-response.decorator.ts
    │   │   └── module-feature.decorator.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── refresh-token.guard.ts
    │   │   ├── permissions.guard.ts
    │   │   ├── super-admin-ip.guard.ts
    │   │   └── subscription.guard.ts
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
    │   │   ├── dropdown-query.dto.ts
    │   │   └── base-response.dto.ts
    │   ├── enums/
    │   │   ├── language.enum.ts
    │   │   └── status.enum.ts
    │   ├── interfaces/
    │   │   ├── pagination.interface.ts
    │   │   ├── repository.interface.ts
    │   │   └── audit.interface.ts
    │   ├── types/
    │   │   ├── i18n.types.ts
    │   │   ├── permission.types.ts
    │   │   └── request.types.ts
    │   └── utils/
    │       ├── math/
    │       │   └── decimal.util.ts
    │       ├── financial/
    │       │   ├── tax.util.ts
    │       │   ├── discount.util.ts
    │       │   ├── invoice.util.ts
    │       │   ├── payroll.util.ts
    │       │   ├── interest.util.ts
    │       │   └── currency.util.ts
    │       └── date/
    │           ├── hijri.util.ts
    │           ├── fiscal.util.ts
    │           ├── working-days.util.ts
    │           └── date-range.util.ts
    │
    ├── database/
    │   ├── database.module.ts
    │   ├── tenant-sequelize.service.ts
    │   ├── umzug.service.ts
    │   ├── migrate.ts
    │   ├── base.entity.ts
    │   ├── base.repository.ts
    │   ├── entities/                        ← ALL entities live here (centralized)
    │   │   ├── index.ts
    │   │   ├── admin.entity.ts
    │   │   ├── tenant.entity.ts
    │   │   ├── user.entity.ts
    │   │   ├── user-fcm-token.entity.ts
    │   │   ├── user-role.entity.ts
    │   │   ├── role.entity.ts
    │   │   ├── permission.entity.ts
    │   │   ├── role-permission.entity.ts
    │   │   ├── notification.entity.ts
    │   │   ├── notification-preference.entity.ts
    │   │   ├── notification-template.entity.ts
    │   │   ├── audit-log.entity.ts
    │   │   ├── refresh-token.entity.ts
    │   │   ├── api-key.entity.ts
    │   │   ├── security-event.entity.ts
    │   │   ├── consent-record.entity.ts
    │   │   ├── erasure-request.entity.ts
    │   │   ├── outbox-event.entity.ts
    │   │   ├── retention-log.entity.ts
    │   │   ├── impersonation-log.entity.ts
    │   │   ├── tenant-metric.entity.ts
    │   │   ├── tenant-onboarding.entity.ts
    │   │   ├── plan.entity.ts
    │   │   ├── subscription.entity.ts
    │   │   ├── payment-transaction.entity.ts
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
    │   ├── repositories/                    ← ALL repositories live here (centralized)
    │   │   ├── index.ts
    │   │   ├── admins.repository.ts
    │   │   ├── auth.repository.ts
    │   │   ├── tenants.repository.ts
    │   │   ├── users.repository.ts
    │   │   ├── roles.repository.ts
    │   │   ├── permissions.repository.ts
    │   │   ├── notifications.repository.ts
    │   │   ├── notification-preferences.repository.ts
    │   │   ├── notification-templates.repository.ts
    │   │   ├── employees.repository.ts
    │   │   ├── departments.repository.ts
    │   │   ├── leaves.repository.ts
    │   │   ├── products.repository.ts
    │   │   ├── categories.repository.ts
    │   │   ├── warehouses.repository.ts
    │   │   ├── stock-levels.repository.ts
    │   │   ├── stock-movements.repository.ts
    │   │   ├── contacts.repository.ts
    │   │   ├── leads.repository.ts
    │   │   ├── sales-orders.repository.ts
    │   │   ├── sales-order-lines.repository.ts
    │   │   ├── vendors.repository.ts
    │   │   ├── purchase-orders.repository.ts
    │   │   ├── purchase-order-lines.repository.ts
    │   │   ├── projects.repository.ts
    │   │   └── tasks.repository.ts
    │   ├── migrations/
    │   │   ├── shared/
    │   │   │   ├── 20240101000000-create-tenants.ts
    │   │   │   ├── 20240101000001-create-plans-subscriptions.ts
    │   │   │   ├── 20240101000002-create-admins.ts
    │   │   │   └── 20240101000003-create-tenant-system-tables.ts
    │   │   └── tenant/
    │   │       ├── 20240101000001-create-users.ts
    │   │       ├── 20240101000002-create-roles-permissions.ts
    │   │       ├── 20240101000003-create-audit-logs.ts
    │   │       ├── 20240101000004-create-notifications.ts
    │   │       ├── 20240101000005-create-fcm-tokens.ts
    │   │       ├── 20240101000006-create-refresh-tokens-api-keys.ts
    │   │       ├── 20240101000007-create-notification-prefs-templates.ts
    │   │       ├── 20240101000008-create-hr-tables.ts
    │   │       ├── 20240101000009-create-inventory-tables.ts
    │   │       ├── 20240101000010-create-crm-tables.ts
    │   │       ├── 20240101000011-create-purchasing-tables.ts
    │   │       ├── 20240101000012-create-project-tables.ts
    │   │       └── 20240101000013-create-system-tables.ts
    │   └── mongodb/
    │       ├── mongodb.module.ts
    │       └── schemas/
    │           ├── audit-log.schema.ts
    │           └── notification.schema.ts
    │
    ├── shared/                              ← @Global shared services (*SharedService suffix)
    │   ├── shared.module.ts
    │   ├── index.ts
    │   ├── services/
    │   │   ├── notification-shared.service.ts      (NotificationSharedService)
    │   │   ├── storage-shared.service.ts           (StorageSharedService)
    │   │   ├── pdf-shared.service.ts               (PdfSharedService)
    │   │   ├── currency-shared.service.ts          (CurrencySharedService)
    │   │   ├── tax-shared.service.ts               (TaxSharedService)
    │   │   ├── user-lookup-shared.service.ts       (UserLookupSharedService)
    │   │   ├── audit-shared.service.ts             (AuditSharedService)
    │   │   ├── status-transition-shared.service.ts (StatusTransitionSharedService)
    │   │   ├── date-shared.service.ts              (DateSharedService)
    │   │   ├── financial-shared.service.ts         (FinancialSharedService)
    │   │   ├── encryption-shared.service.ts        (EncryptionSharedService)
    │   │   ├── data-privacy-shared.service.ts      (DataPrivacySharedService)
    │   │   ├── idempotency-shared.service.ts       (IdempotencySharedService)
    │   │   ├── outbox-shared.service.ts            (OutboxSharedService)
    │   │   └── feature-flag-shared.service.ts      (FeatureFlagSharedService)
    │   └── interfaces/
    │       ├── status-transition.interface.ts
    │       ├── outbox.interface.ts
    │       ├── data-privacy.interface.ts
    │       └── idempotency.interface.ts
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
    │   │   │   └── auth.interface.ts
    │   │   └── auth.module.ts
    │   │
    │   ├── admins/
    │   │   ├── controllers/
    │   │   │   └── admins.controller.ts
    │   │   ├── services/
    │   │   │   └── admins.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-admin.dto.ts
    │   │   │   ├── update-admin.dto.ts
    │   │   │   └── admin-login.dto.ts
    │   │   └── admins.module.ts
    │   │
    │   ├── tenants/
    │   │   ├── controllers/
    │   │   │   └── tenants.controller.ts
    │   │   ├── services/
    │   │   │   ├── tenants.service.ts
    │   │   │   └── tenant-provisioner.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-tenant.dto.ts
    │   │   │   └── update-tenant.dto.ts
    │   │   └── tenants.module.ts
    │   │
    │   ├── users/
    │   │   ├── controllers/
    │   │   │   └── users.controller.ts
    │   │   ├── services/
    │   │   │   └── users.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-user.dto.ts
    │   │   │   ├── update-user.dto.ts
    │   │   │   ├── change-password.dto.ts
    │   │   │   └── consent.dto.ts
    │   │   └── users.module.ts
    │   │
    │   ├── roles/
    │   │   ├── controllers/
    │   │   │   └── roles.controller.ts
    │   │   ├── services/
    │   │   │   ├── roles.service.ts
    │   │   │   ├── permissions.service.ts
    │   │   │   └── permission-cache.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-role.dto.ts
    │   │   │   ├── update-role.dto.ts
    │   │   │   └── assign-permission.dto.ts
    │   │   └── roles.module.ts
    │   │
    │   ├── subscriptions/                   ← @Global module (plans, billing, payments)
    │   │   ├── controllers/
    │   │   │   ├── plans.controller.ts
    │   │   │   └── subscriptions.controller.ts
    │   │   ├── services/
    │   │   │   ├── plans.service.ts
    │   │   │   ├── subscriptions.service.ts
    │   │   │   ├── payment.service.ts
    │   │   │   └── moyasar.provider.ts
    │   │   ├── dto/
    │   │   │   ├── create-plan.dto.ts
    │   │   │   ├── update-plan.dto.ts
    │   │   │   └── create-subscription.dto.ts
    │   │   ├── providers/
    │   │   │   └── payment-provider.interface.ts
    │   │   └── subscriptions.module.ts
    │   │
    │   ├── notifications/
    │   │   ├── controllers/
    │   │   │   └── notifications.controller.ts
    │   │   ├── services/
    │   │   │   ├── notifications.service.ts
    │   │   │   ├── fcm.processor.ts
    │   │   │   └── sms.processor.ts
    │   │   ├── dto/
    │   │   │   ├── send-notification.dto.ts
    │   │   │   ├── query-notifications.dto.ts
    │   │   │   ├── update-preferences.dto.ts
    │   │   │   ├── create-template.dto.ts
    │   │   │   └── update-template.dto.ts
    │   │   ├── interfaces/
    │   │   │   └── notification.interface.ts
    │   │   └── notifications.module.ts
    │   │
    │   ├── chat/
    │   │   ├── controllers/
    │   │   │   ├── chat.controller.ts
    │   │   │   └── chat.gateway.ts
    │   │   ├── services/
    │   │   │   ├── chat.service.ts
    │   │   │   └── firestore-chat.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-conversation.dto.ts
    │   │   │   ├── send-message.dto.ts
    │   │   │   ├── add-reaction.dto.ts
    │   │   │   ├── reply-message.dto.ts
    │   │   │   └── query-messages.dto.ts
    │   │   ├── interfaces/
    │   │   │   └── chat.interface.ts
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
    │   │   ├── dto/
    │   │   │   ├── create-employee.dto.ts
    │   │   │   ├── update-employee.dto.ts
    │   │   │   ├── create-department.dto.ts
    │   │   │   ├── update-department.dto.ts
    │   │   │   ├── create-leave-request.dto.ts
    │   │   │   └── update-leave-request.dto.ts
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
    │   │   │   ├── stock-movements.service.ts
    │   │   │   └── low-stock.processor.ts
    │   │   ├── dto/
    │   │   │   ├── create-product.dto.ts
    │   │   │   ├── update-product.dto.ts
    │   │   │   ├── create-stock-movement.dto.ts
    │   │   │   ├── create-category.dto.ts
    │   │   │   ├── update-category.dto.ts
    │   │   │   ├── create-warehouse.dto.ts
    │   │   │   ├── update-warehouse.dto.ts
    │   │   │   ├── bulk-create-products.dto.ts
    │   │   │   ├── bulk-update-products.dto.ts
    │   │   │   └── bulk-delete-products.dto.ts
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
    │   │   ├── dto/
    │   │   │   ├── create-contact.dto.ts
    │   │   │   ├── update-contact.dto.ts
    │   │   │   ├── create-lead.dto.ts
    │   │   │   ├── update-lead.dto.ts
    │   │   │   ├── transition-lead.dto.ts
    │   │   │   ├── create-sales-order.dto.ts
    │   │   │   ├── update-sales-order.dto.ts
    │   │   │   └── create-sales-order-line.dto.ts
    │   │   └── crm.module.ts
    │   │
    │   ├── purchasing/
    │   │   ├── controllers/
    │   │   │   ├── vendors.controller.ts
    │   │   │   └── purchase-orders.controller.ts
    │   │   ├── services/
    │   │   │   ├── vendors.service.ts
    │   │   │   └── purchase-orders.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-vendor.dto.ts
    │   │   │   ├── update-vendor.dto.ts
    │   │   │   ├── create-purchase-order.dto.ts
    │   │   │   ├── update-purchase-order.dto.ts
    │   │   │   ├── create-purchase-order-line.dto.ts
    │   │   │   └── receive-items.dto.ts
    │   │   └── purchasing.module.ts
    │   │
    │   ├── projects/
    │   │   ├── controllers/
    │   │   │   ├── projects.controller.ts
    │   │   │   └── tasks.controller.ts
    │   │   ├── services/
    │   │   │   ├── projects.service.ts
    │   │   │   └── tasks.service.ts
    │   │   ├── dto/
    │   │   │   ├── create-project.dto.ts
    │   │   │   ├── update-project.dto.ts
    │   │   │   ├── create-task.dto.ts
    │   │   │   ├── update-task.dto.ts
    │   │   │   └── transition-task.dto.ts
    │   │   └── projects.module.ts
    │   │
    │   └── reporting/
    │       ├── controllers/
    │       │   └── reporting.controller.ts
    │       ├── services/
    │       │   ├── reporting.service.ts
    │       │   └── report-export.processor.ts
    │       ├── dto/
    │       │   ├── report-query.dto.ts
    │       │   └── export-report.dto.ts
    │       ├── interfaces/
    │       │   └── report.interface.ts
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
    │   ├── audit/
    │   │   ├── audit.module.ts
    │   │   └── audit.service.ts
    │   ├── tracing/
    │   │   ├── tracing.module.ts
    │   │   └── tracing.service.ts
    │   └── metrics/
    │       ├── metrics.module.ts
    │       ├── metrics.service.ts
    │       └── metrics.controller.ts
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
├── controllers/     ← one controller per resource (+ gateways/processors if applicable)
├── services/        ← one service per resource (+ processors if applicable)
├── dto/             ← request DTOs only
├── interfaces/      ← interfaces, enums, types for this module (optional — only if needed)
└── module-name.module.ts
```

- Entities live in `src/database/entities/` — **never** inside a module folder
- Repositories live in `src/database/repositories/` — **centralized**, not per-module
- BullMQ processors live in the module's `services/` folder (e.g. `services/fcm.processor.ts`)
- WebSocket gateways live in the module's `controllers/` folder (e.g. `controllers/chat.gateway.ts`)
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
Pass `searchFields: ['name', 'description']` — the repository automatically searches both `nameEn`/`nameAr` and `descriptionEn`/`descriptionAr` using `Op.iLike`.

### Bilingual sort (automatic)
Pass `sortBy: 'name'` + `lang: 'ar'` — the repository automatically sorts by `nameAr`.

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
nameEn: string;
nameAr: string;
descriptionEn: string;
descriptionAr: string;

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
`ResponseInterceptor` automatically flattens `_en`/`_ar` fields to plain `name` based on user lang before sending. **Never return `nameEn`/`nameAr` raw to clients.**

### Search: always search both columns
```typescript
// Searching 'name' automatically queries nameEn AND nameAr
{ [Op.or]: [
  { nameEn: { [Op.iLike]: `%${query}%` } },
  { nameAr: { [Op.iLike]: `%${query}%` } },
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
- `name` is always resolved to user's language — never return `nameEn`/`nameAr` raw
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

All shared services use the `*SharedService` suffix naming convention and `*-shared.service.ts` filename convention.

```
shared/services/
├── notification-shared.service.ts       NotificationSharedService — sendPush / sendSms / sendEmail / sendInApp
├── storage-shared.service.ts            StorageSharedService — upload / download / delete files
├── pdf-shared.service.ts                PdfSharedService — generate any PDF via Puppeteer
├── currency-shared.service.ts           CurrencySharedService — convert amounts + fetch live rates
├── tax-shared.service.ts                TaxSharedService — calculate tax + build tax breakdown
├── user-lookup-shared.service.ts        UserLookupSharedService — get user/permissions without circular dep
├── audit-shared.service.ts              AuditSharedService — write audit logs from anywhere
├── status-transition-shared.service.ts  StatusTransitionSharedService — validate + apply status changes
├── date-shared.service.ts               DateSharedService — hijri/gregorian + fiscal + working days
├── financial-shared.service.ts          FinancialSharedService — invoice totals, payroll, rounding
├── encryption-shared.service.ts         EncryptionSharedService — AES-256-GCM field-level encryption (Section 27.6)
├── data-privacy-shared.service.ts       DataPrivacySharedService — PDPL/GDPR data export + erasure (Section 30)
├── idempotency-shared.service.ts        IdempotencySharedService — idempotency key cache in Redis (Section 33)
├── outbox-shared.service.ts             OutboxSharedService — reliable event dispatch via outbox pattern (Section 26)
└── feature-flag-shared.service.ts       FeatureFlagSharedService — tenant feature flag checks (Section 35.2)
```

**Rules:**
- Feature modules **never** import other feature modules directly
- If module A needs something from module B → extract it to `SharedModule`
- `SharedModule` **never** imports any feature module
- Never duplicate shared logic across modules
- All shared service class names use the `*SharedService` suffix (e.g. `AuditSharedService`, not `SharedAuditService`)

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
@UseGuards(SuperSuperAdminIpGuard)                            // reads ADMIN_IPS from env
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
10. src/database/repositories/ all repositories (centralized)
11. src/database/migrations/  all migration files
12. src/database/             database.module, tenant-sequelize, umzug, base.repository
13. src/infrastructure/       cache, queues, firebase, mail, pdf, storage, audit, tracing, metrics, websockets
14. src/shared/               SharedModule + all 15 shared services (*SharedService suffix)
15. src/common/               decorators, guards, interceptors, filters, pipes, middleware
16. src/i18n/                 all JSON translation files
17. src/modules/auth/
18. src/modules/admins/
19. src/modules/tenants/
20. src/modules/users/
21. src/modules/roles/
22. src/modules/subscriptions/ (@Global — plans, billing, payments)
23. src/modules/notifications/
24. src/modules/chat/
25. src/modules/hr/
26. src/modules/inventory/
27. src/modules/crm/
28. src/modules/purchasing/
29. src/modules/projects/
30. src/modules/reporting/
31. src/health/
32. src/app.module.ts
33. src/main.ts
34. .github/workflows/ci.yml + deploy.yml
```

---

## 25. What Is NOT Included Yet (Phase 2)

The following modules will be added in a separate prompt after Phase 1 is complete and verified:

- Accounting & Finance (chart of accounts, journal entries, invoices, payments)
- Payroll processing (payroll runs, payslips, PDF generation)
- Reporting & Analytics dashboards (P&L, balance sheet, cash flow)

**Do not create stubs or placeholder files for these. Leave them out entirely.**


# ERP Backend — Additional Rules & Enhancements

> Append these sections to the existing CLAUDE.md file.
> Each section is numbered to continue from Section 25.

---

## 26. Outbox Pattern (Reliable Event Dispatch)

**Purpose:** Guarantee no notification/email/SMS is lost even if Redis/BullMQ crashes after a DB write.

### How it works
1. Within the same DB transaction that creates the business record, also insert a row into `outbox_events`
2. A BullMQ cron job (every 10s) polls `outbox_events` for unprocessed rows and enqueues them
3. On successful queue enqueue, mark row as `processed`

### outbox_events table
```typescript
id:          UUID, primary key
tenantSlug:  string                          // which tenant schema
eventType:   string                          // 'SEND_EMAIL' | 'SEND_FCM' | 'SEND_SMS'
payload:     JSONB                           // full job payload
status:      'pending' | 'processed' | 'failed'
attempts:    number (default 0)
lastError:   string | null
processedAt: Date | null
createdAt:   Date
```

### Rules
- Outbox table lives in the **tenant schema** (not public)
- Always insert outbox row **inside the same transaction** as the business record — never after commit
- Outbox processor marks `processed` only after successful BullMQ enqueue — never before
- Failed rows (after 3 attempts) marked `failed` — alert via Sentry, never silently dropped
- Outbox processor runs as a dedicated BullMQ repeatable job: `erp:outbox` queue
- Never bypass the outbox to enqueue directly — all async side effects go through outbox

### Example
```typescript
const transaction = await this.sequelize.transaction();
try {
  const invoice = await this.invoiceRepo.create(data, { transaction });
  await this.outboxRepo.create({
    tenantSlug,
    eventType: 'SEND_EMAIL',
    payload: { to: client.email, template: 'invoice', invoiceId: invoice.id },
    status: 'pending',
  }, { transaction });
  await transaction.commit();
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

---

## 27. Security Enhancements

### 27.1 Refresh Token Rotation
- Every `/auth/refresh` call invalidates the old refresh token and issues a brand new one
- Store refresh tokens hashed (bcrypt) in a `refresh_tokens` table — never store plain tokens
- Old token immediately marked `revoked: true` on use

### 27.2 Refresh Token Family Detection (Reuse Detection)
- Each token belongs to a `family` (UUID assigned at login)
- If a **revoked** token is presented again → entire family is invalidated immediately
- User is force-logged out of all devices + notified via email

### refresh_tokens table
```typescript
id:           UUID
userId:       UUID (FK)
tenantSlug:   string
tokenHash:    string         // bcrypt hash of the raw token
family:       UUID           // same family = same login session
revoked:      boolean
revokedAt:    Date | null
expiresAt:    Date
ipAddress:    string
userAgent:    string
createdAt:    Date
```

### 27.3 Device / Session Management
- On login, record: `deviceName`, `ipAddress`, `userAgent`, `lastSeenAt` in `refresh_tokens`
- Expose `GET /auth/sessions` — returns all active sessions for current user
- Expose `DELETE /auth/sessions/:id` — revoke a specific session
- Expose `DELETE /auth/sessions` — revoke all sessions (logout everywhere)

### 27.4 Failed Login Lockout
- After **5 consecutive failed** login attempts → lock account for **15 minutes**
- Store `failedLoginAttempts: number` and `lockedUntil: Date | null` on `users` table
- On lockout: write to audit log + send warning email to user
- Reset counter on successful login

### 27.5 Suspicious Activity Detection
- On login, compare current IP country against user's last known country
- If different country or first login from IP → send alert email: "New login detected from [country]"
- Log to `security_events` table (eventType, userId, ipAddress, country, userAgent, createdAt)

### 27.6 Field-level Encryption
Encrypt sensitive fields before storing, decrypt on read:
```typescript
// Encrypted fields (AES-256-GCM):
nationalId, iban, bankAccountNumber, basicSalary, netSalary
```
- Use a dedicated `EncryptionService` in `SharedModule`
- Encryption key stored in env as `FIELD_ENCRYPTION_KEY` — never hardcoded
- Encrypted values stored as base64 strings with IV prefix
- Never log encrypted field values — mask in all logs

### 27.7 API Key Authentication
- Tenants can generate API keys for B2B integrations
- API keys stored hashed in `api_keys` table with: `name`, `keyHash`, `lastUsedAt`, `expiresAt`, `scopes[]`
- `ApiKeyGuard` accepts `X-API-Key` header as alternative to JWT Bearer token
- API keys are scoped (e.g. `invoices:read`, `products:write`) — not full access
- Revocable at any time from tenant admin panel

### 27.8 Webhook Signatures
- All outgoing webhooks signed with HMAC-SHA256 using tenant's webhook secret
- Signature sent in `X-ERP-Signature: sha256=<hex>` header
- Receivers can verify: `HMAC-SHA256(secret, rawBody) === signature`
- Webhook secret rotatable by tenant admin

---

## 28. Data Retention Policies

### Rules
- Each tenant can configure retention periods per data type (default values enforced if not configured)
- Retention config stored in `tenant_settings` JSONB column
- A BullMQ repeatable cron job (`erp:retention`, runs nightly) processes all tenants

### Default retention periods
```typescript
const DEFAULT_RETENTION = {
  auditLogs:        365,   // days
  notifications:     90,
  softDeletedRecords: 90,
  securityEvents:   180,
  outboxProcessed:   30,
  chatMessages:     730,   // 2 years
};
```

### Retention processor behavior
- Soft-deleted records past retention period → permanently hard-deleted
- Processed outbox events past retention → purged
- Old notifications past retention → purged
- Audit logs are **never** purged if `complianceMode: true` on tenant
- All purge actions logged to a `retention_log` table (what was deleted, count, timestamp)
- Purge runs in batches of 500 to avoid DB locks

### retention_log table
```typescript
id:           UUID
tenantSlug:   string
dataType:     string     // 'audit_logs' | 'notifications' | ...
recordsPurged: number
purgedAt:     Date
```

---

## 29. ZATCA Phase 2 Readiness

All invoice entities and creation flows **must** include these fields from day one:

### Required fields on sales_order / invoice entities
```typescript
// ZATCA identifiers
zatcaUUID:           string (UUID v4)    // unique per invoice, generated on create
zatcaInvoiceCounter: number             // sequential per tenant, never reset
zatcaHash:           string | null       // cryptographic hash of invoice data (Phase 2)
zatcaQRCode:         string | null       // base64 TLV QR string
zatcaSignature:      string | null       // XML digital signature (Phase 2)
zatcaSubmittedAt:    Date | null
zatcaClearedAt:      Date | null
zatcaStatus:         'pending' | 'reported' | 'cleared' | 'rejected' | null

// Invoice classification (ZATCA)
invoiceType:         'standard' | 'simplified'   // B2B = standard, B2C = simplified
transactionType:     'invoice' | 'debit_note' | 'credit_note'
supplyType:          'goods' | 'services' | 'both'

// Tax fields
taxCategory:         'S' | 'Z' | 'E' | 'O'      // Standard/Zero/Exempt/OutOfScope
taxExemptionCode:    string | null
taxExemptionReason:  string | null
```

### Rules
- `zatcaUUID` and `zatcaInvoiceCounter` **always** generated on invoice creation — no exceptions
- `zatcaInvoiceCounter` is per-tenant monotonically increasing — use DB sequence, never application-level counter
- QR code generation must follow ZATCA TLV encoding spec (Seller name, VAT number, timestamp, total, VAT amount)
- Tax applied **after discount per line** — per ZATCA spec (already in invoice.util.ts)
- Credit/debit notes must reference original invoice UUID
- Never allow editing a submitted/cleared invoice — create credit note instead

---

## 30. GDPR / PDPL Compliance (Saudi Personal Data Protection Law)

### Required endpoints
```typescript
POST   /api/v1/users/me/data-export      // export all personal data as JSON
POST   /api/v1/users/me/erasure-request  // request account anonymization
GET    /api/v1/users/me/consents         // view consent history
POST   /api/v1/users/me/consents         // record new consent
DELETE /api/v1/users/me/consents/:type   // withdraw consent
```

### consent_records table (tenant schema)
```typescript
id:           UUID
userId:       UUID
consentType:  'marketing_email' | 'sms_notifications' | 'data_analytics' | 'third_party_sharing'
granted:      boolean
ipAddress:    string
userAgent:    string
grantedAt:    Date
revokedAt:    Date | null
```

### erasure_requests table (tenant schema)
```typescript
id:            UUID
userId:        UUID
requestedAt:   Date
status:        'pending' | 'processing' | 'completed' | 'rejected'
reason:        string | null
processedAt:   Date | null
processedBy:   UUID | null   // admin who processed
```

### Data anonymization rules (on erasure)
```typescript
// Replace with anonymized values — never hard delete user record
email:       → `deleted_${uuid}@anonymized.invalid`
phone:       → null
nationalId:  → null (encrypted field wiped)
firstnameEn/ar: → 'Deleted'
lastnameEn/ar:  → 'User'
// Preserve: id, createdAt, roles (for audit integrity)
// Audit logs referencing userId are kept but userId masked as '[DELETED]'
```

### Rules
- Data export must include: profile, roles, activity log, notifications, consents
- Export generated as JSON, uploaded to S3 with signed URL returned (expires in 1 hour)
- Erasure requests processed within 30 days (PDPL requirement) — BullMQ job handles it
- Marketing communications require explicit opt-in consent — never default to true
- Log every consent change with IP + timestamp — immutable
- `DataPrivacyService` in SharedModule handles all PDPL operations

---

## 31. Performance Enhancements

### 31.1 Database Connection Pool (Mandatory Config)
```typescript
// database.config.ts
pool: {
  min:     2,
  max:     10,        // increase for production (20-50)
  acquire: 30000,     // ms to wait before throwing error
  idle:    10000,     // ms before releasing idle connection
  evict:   1000,      // ms interval to remove idle connections
}
```

### 31.2 Query Result Caching (Redis)
- Cache expensive read queries in Redis with explicit TTLs
- Cache key pattern: `cache:{tenantSlug}:{resource}:{paramsHash}`
- Invalidate on any write to that resource
- Default TTLs:
```typescript
const CACHE_TTL = {
  dropdown:    300,    // 5 min — rarely changes
  dashboard:   60,     // 1 min — near real-time
  reports:     600,    // 10 min — heavy queries
  permissions: 300,    // 5 min — already defined
  exchangeRates: 3600, // 1 hour — external API
};
```
- Use `@CacheResponse()` decorator on controller methods
- Cache **never** used for financial totals that feed into invoices/payroll — always fresh DB read

### 31.3 Cursor-based Pagination
Add `CursorPaginationDto` as alternative to offset pagination for:
- `audit_logs` — can have millions of rows
- `stock_movements` — high-volume append-only
- `chat messages` — infinite scroll
- `notifications` — infinite scroll

```typescript
// Request
GET /audit-logs?cursor=eyJpZCI6...&limit=50&direction=next

// Response meta
{
  "meta": {
    "limit": 50,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextCursor": "eyJpZCI6...",
    "prevCursor": null
  }
}
```
Cursor is base64-encoded `{ id, createdAt }` — never expose raw DB values.

### 31.4 Database Index Standard (Mandatory)
Every migration **must** include explicit indexes for:
```typescript
// Always index:
- All foreign key columns
- status columns
- createdAt (for sorting/filtering by date)
- nameEn, nameAr (for search — use GIN trigram index for iLike)
- Composite: [tenantSlug + status], [userId + createdAt]

// Example in migration:
await queryInterface.addIndex('products', ['status']);
await queryInterface.addIndex('products', ['nameEn'], { using: 'GIN', operator: 'gin_trgm_ops' });
await queryInterface.addIndex('products', ['nameAr'], { using: 'GIN', operator: 'gin_trgm_ops' });
await queryInterface.addIndex('products', ['createdAt']);
```
Enable `pg_trgm` extension in initial migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### 31.5 Read Replica Support
```typescript
// database.config.ts — support optional read replica
replication: {
  write: { host: DB_HOST, ... },
  read:  [{ host: DB_READ_HOST, ... }],   // optional, falls back to write if not set
}
// BaseRepository automatically uses read connection for findAll/findOne
// and write connection for create/update/delete
```

---

## 32. Bulk Endpoints Standard

Every resource that supports it **must** expose bulk endpoints:

```typescript
POST   /api/v1/products/bulk-create
PATCH  /api/v1/products/bulk-update
DELETE /api/v1/products/bulk-delete
```

### Rules
- Max items per bulk request: **100** (enforced via DTO `@ArrayMaxSize(100)`)
- Entire bulk operation runs in a **single transaction** — all succeed or all fail
- Response includes per-item results:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "succeeded": 98,
    "failed": 2,
    "results": [
      { "index": 0, "id": "uuid", "status": "created" },
      { "index": 3, "status": "failed", "error": "SKU_DUPLICATE" }
    ]
  }
}
```
- Partial success only allowed on `bulk-delete` — all-or-nothing for create/update
- Each item validated individually first — return all validation errors before executing
- Bulk operations always written to audit log as a single grouped entry

---

## 33. Idempotency Keys

For critical non-idempotent POST operations, support `Idempotency-Key` header:

### Endpoints requiring idempotency
```
POST /invoices
POST /payments
POST /payroll/run
POST /stock-movements
POST /purchase-orders
POST /sales-orders
```

### How it works
1. Client sends `Idempotency-Key: <uuid-v4>` header
2. Server checks Redis for `idempotency:{tenantSlug}:{key}`
3. If found → return cached response immediately (no DB write)
4. If not found → execute normally, store result in Redis for 24h, return result

### idempotency cache entry
```typescript
{
  key:        string,
  tenantSlug: string,
  userId:     string,
  endpoint:   string,
  response:   object,     // full response body cached
  createdAt:  Date,
  expiresAt:  Date,       // 24 hours
}
```

### Rules
- Idempotency key enforced via `IdempotencyInterceptor` — applied per endpoint with `@UseInterceptors`
- Key scoped to `tenantSlug + userId + key` — same key from different users is a different request
- If a request with same key is in-flight (race condition) → return `409 Conflict` with `IDEMPOTENCY_CONFLICT`
- Idempotency keys are one-time — cannot be reused after 24h expiry
- Keys not required (but accepted) on GET/PUT/PATCH/DELETE — those are already idempotent by nature

---

## 34. Notification Enhancements

### 34.1 Notification Preferences
```typescript
// notification_preferences table
userId:       UUID
tenantSlug:   string
channel:      'push' | 'email' | 'sms' | 'in_app'
eventType:    string    // 'invoice_approved' | 'task_assigned' | 'stock_low' | ...
enabled:      boolean
createdAt:    Date
updatedAt:    Date

// Endpoints
GET    /api/v1/notifications/preferences
PATCH  /api/v1/notifications/preferences   // bulk update
```

### Rules
- Default: all channels enabled for all events
- `NotificationService` **always** checks preferences before dispatching
- SMS defaults to **opt-out** (disabled by default) — requires explicit opt-in

### 34.2 Notification Templates in Database
```typescript
// notification_templates table (tenant schema)
id:           UUID
tenantSlug:   string
eventType:    string
channel:      'push' | 'email' | 'sms'
subject_en:   string | null
subject_ar:   string | null
body_en:      string           // Handlebars template string
body_ar:      string
isDefault:    boolean          // system default vs tenant-customized
createdAt:    Date
updatedAt:    Date
```
- Tenants can override default templates
- File-based templates (`/infrastructure/mail/templates/`) used as fallback if DB template not found
- Template variables documented per event type in `notification.interface.ts`

### 34.3 Notification Read Receipts
```typescript
// Add to notifications table:
readAt:     Date | null
readCount:  number (default 0)

// Endpoints
PATCH  /api/v1/notifications/:id/read        // mark single as read
PATCH  /api/v1/notifications/read-all        // mark all as read
GET    /api/v1/notifications?unread=true     // filter unread only
```
Unread count included in user profile response: `{ unreadNotifications: 12 }`

### 34.4 Scheduled Notifications
```typescript
// Add to notification dispatch payload:
sendAt?: Date    // if provided, delay BullMQ job until this datetime

// BullMQ delayed job:
await this.notificationQueue.add('send', payload, {
  delay: sendAt ? sendAt.getTime() - Date.now() : 0,
});
```

---

## 35. Multi-Tenancy Enhancements

### 35.1 Tenant Status
```typescript
// Add to tenants table:
status: 'trial' | 'active' | 'suspended' | 'cancelled'
trialEndsAt:    Date | null
suspendedAt:    Date | null
suspendReason:  string | null
cancelledAt:    Date | null
```

`TenantStatusGuard` runs after `JwtAuthGuard`:
- `suspended` → `403` with error code `TENANT_SUSPENDED`
- `cancelled` → `403` with error code `TENANT_CANCELLED`
- `trial` + past `trialEndsAt` → `403` with error code `TRIAL_EXPIRED`
- Super admin endpoints bypass this guard

### 35.2 Tenant Feature Flags
```typescript
// Add to tenants table:
features: JSONB   // default: all enabled

// Example:
{
  "hr":         true,
  "inventory":  true,
  "crm":        true,
  "purchasing": true,
  "projects":   true,
  "chat":       false,   // tenant hasn't subscribed to chat
  "reporting":  true,
}
```
`FeatureFlagGuard` checks `tenant.features[moduleName]` before allowing access.
Decorator: `@RequireFeature('chat')` — applied at controller level.

### 35.3 Tenant Usage Metrics
```typescript
// tenant_metrics table (public schema — not per-tenant)
tenantSlug:     string
metricDate:     Date      // daily snapshot
activeUsers:    number
apiCallsTotal:  number
storageUsedMb:  number
recordsTotal:   number
createdAt:      Date
```
- BullMQ cron job (`erp:metrics`, runs daily at midnight) calculates and stores snapshot
- Exposed to super admin via `GET /api/v1/admin/tenants/:slug/metrics`

### 35.4 Tenant Onboarding Checklist
```typescript
// tenant_onboarding table (public schema)
tenantSlug:         string
logoUploaded:       boolean (default false)
firstUserCreated:   boolean (default false)
firstEmployeeAdded: boolean (default false)
firstProductAdded:  boolean (default false)
firstInvoiceCreated:boolean (default false)
completedAt:        Date | null

// Endpoint
GET /api/v1/onboarding/checklist    // returns checklist for current tenant
```
Steps auto-marked complete by respective services (e.g. `EmployeesService` marks `firstEmployeeAdded: true`).

### 35.5 Super Admin Impersonation
```typescript
// Endpoint (super admin only, behind SuperAdminIpGuard)
POST /api/v1/admin/impersonate
Body: { tenantSlug: string, userId: string, reason: string }
Returns: { accessToken, refreshToken }   // short-lived 15m token only, no refresh
```

```typescript
// impersonation_log table (public schema — immutable)
id:              UUID
adminId:         UUID
targetUserId:    UUID
tenantSlug:      string
reason:          string
ipAddress:       string
startedAt:       Date
tokenExpiresAt:  Date
```
- Impersonation token includes `impersonatedBy: adminId` in JWT payload
- All actions during impersonation tagged in audit log as `[IMPERSONATED by adminId]`
- Impersonation log is **append-only** — no updates, no deletes, ever

---

## 36. Observability

### 36.1 Structured Request Logging
`LoggerMiddleware` logs every request as structured JSON:
```json
{
  "level":       "info",
  "type":        "http_request",
  "method":      "POST",
  "url":         "/api/v1/invoices",
  "statusCode":  201,
  "duration":    142,
  "tenantSlug":  "acme",
  "userId":      "uuid",
  "requestId":   "uuid",
  "ip":          "1.2.3.4",
  "userAgent":   "Mozilla/...",
  "timestamp":   "2025-03-06T10:00:00Z"
}
```
- `duration` measured from request start to response end (ms)
- Sensitive fields never logged: `password`, `token`, `nationalId`, `iban`
- Request body logged in `development` only — never in `production`

### 36.2 Slow Query Detection
- Sequelize `afterQuery` hook measures execution time
- Queries > **500ms** → logged as `warn` with full SQL (sanitized) + duration
- Queries > **2000ms** → logged as `error` + Sentry alert
- Query logging disabled in `test` environment

### 36.3 Enhanced Health Check
```typescript
// GET /health — checks all dependencies
{
  "status": "ok",
  "checks": {
    "database":    { "status": "ok",   "responseTime": 12 },
    "redisCache":  { "status": "ok",   "responseTime": 3  },
    "redisQueue":  { "status": "ok",   "responseTime": 4  },
    "firebase":    { "status": "ok"                        },
    "s3":          { "status": "warn", "message": "slow"  },
    "bullmq":      { "status": "ok",   "workers": 3       }
  },
  "uptime": 86400,
  "timestamp": "2025-03-06T10:00:00Z"
}
```
- Returns `200` if all critical checks pass, `503` if any critical check fails
- S3 and Firebase are non-critical (warn only)
- Health endpoint is `@Public()` — no auth required
- Health endpoint excluded from request logging and rate limiting

### 36.4 OpenTelemetry Tracing
```typescript
// main.ts — initialize before NestJS app
import { NodeSDK } from '@opentelemetry/sdk-node';
const sdk = new NodeSDK({ traceExporter: ... });
sdk.start();
```
- Trace spans for: HTTP requests, DB queries, BullMQ jobs, Redis ops, outbound HTTP
- `traceId` included in all log entries and API error responses
- Export to Jaeger (dev) or Datadog (prod) based on `OTEL_EXPORTER` env var

### 36.5 Metrics Endpoint
```typescript
// GET /metrics — Prometheus format, protected by internal IP whitelist
erp_http_requests_total{method, route, status}
erp_http_duration_seconds{method, route}
erp_db_query_duration_seconds{operation}
erp_queue_depth{queue}
erp_active_tenants_total
erp_db_pool_used{pool}
erp_db_pool_idle{pool}
```
- Exposed via `prom-client` package
- Protected by `SuperAdminIpGuard` — never public
- Scraped by Prometheus every 15s in production

---

## 37. Commit Message Standard (Conventional Commits)

### Format
```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types
```
feat:     new feature
fix:      bug fix
perf:     performance improvement
refactor: code change with no feature/fix
chore:    build, deps, config changes
docs:     documentation only
test:     adding or fixing tests
ci:       CI/CD pipeline changes
```

### Scopes (match module names)
```
auth, admins, tenants, users, roles, hr, inventory, crm,
purchasing, projects, notifications, chat, reporting,
db, queue, cache, websocket, firebase, mail, pdf, storage
```

### Examples
```
feat(invoices): add ZATCA QR code generation on invoice create
fix(auth): invalidate token family on refresh token reuse
perf(inventory): add GIN trigram index on product name columns
chore(deps): upgrade sequelize to 6.37.1
feat(hr): implement Saudi GOSI calculation in payroll util
fix(tenants): prevent schema creation race condition on concurrent provisioning
```

### Rules
- Enforced via `commitlint` + Husky pre-commit hook
- Breaking changes: add `!` after type: `feat(auth)!: change JWT payload structure`
- Breaking changes always include migration notes in commit body
- Every PR title must also follow conventional commit format
- `CHANGELOG.md` auto-generated from commit history via `standard-version`

---

## 38. Additional Environment Variables

Add these to `.env.example`:

```env
# Field Encryption
FIELD_ENCRYPTION_KEY=32-char-hex-string-here

# Read Replica (optional)
DB_READ_HOST=
DB_READ_PORT=5432

# OpenTelemetry
OTEL_EXPORTER=jaeger           # jaeger | datadog | none
OTEL_ENDPOINT=http://localhost:14268/api/traces
OTEL_SERVICE_NAME=erp-backend

# Retention
RETENTION_CRON=0 2 * * *       # 2am daily
OUTBOX_POLL_INTERVAL=10000     # ms

# Idempotency
IDEMPOTENCY_TTL=86400           # seconds (24h)

# Webhook
WEBHOOK_SIGNING_SECRET=

# Trial
DEFAULT_TRIAL_DAYS=14
```

---

## 39. Updated Build Order

Insert these steps into the existing build order (Section 24):

```
After step 8 (base.entity.ts), add:
  8b. src/database/entities/outbox-event.entity.ts
  8c. src/database/entities/refresh-token.entity.ts
  8d. src/database/entities/consent-record.entity.ts
  8e. src/database/entities/erasure-request.entity.ts
  8f. src/database/entities/notification-preference.entity.ts
  8g. src/database/entities/notification-template.entity.ts
  8h. src/database/entities/impersonation-log.entity.ts
  8i. src/database/entities/tenant-metric.entity.ts
  8j. src/database/entities/tenant-onboarding.entity.ts
  8k. src/database/entities/security-event.entity.ts
  8l. src/database/entities/api-key.entity.ts
  8m. src/database/entities/retention-log.entity.ts

After step 11 (infrastructure), add:
  11b. src/infrastructure/tracing/         OpenTelemetry setup
  11c. src/infrastructure/metrics/         prom-client setup

After step 13 (SharedModule), add:
  13b. src/shared/services/encryption.service.ts
  13c. src/shared/services/data-privacy.service.ts
  13d. src/shared/services/idempotency.service.ts
  13e. src/shared/services/outbox.service.ts
  13f. src/shared/services/feature-flag.service.ts

After step 14 (common), add:
  14b. src/common/guards/tenant-status.guard.ts
  14c. src/common/guards/feature-flag.guard.ts
  14d. src/common/guards/api-key.guard.ts
  14e. src/common/interceptors/idempotency.interceptor.ts
  14f. src/common/decorators/require-feature.decorator.ts
  14g. src/common/decorators/idempotent.decorator.ts
```