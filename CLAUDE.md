# CLAUDE.md — yusr-app/api

This file is the single source of truth for every Claude Code session in this repository.
Read this entire file before writing any code.

---

## 1. Project Overview

**Product:** Yusr (يُسر) — ERP system for SMEs
**Meaning:** Ease / simplicity in Arabic
**Repo:** `yusr-app/api`
**Role:** NestJS backend API serving all Yusr client apps (web, backoffice, mobile, pos-desktop, pos-web)

---

## 2. Tech Stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | NestJS (Node.js)                         |
| Language         | TypeScript                               |
| Primary DB       | PostgreSQL 16                            |
| Secondary DB     | MongoDB 7 (logs, notifications, chat)    |
| ORM (SQL)        | TypeORM                                  |
| ODM (Mongo)      | Mongoose                                 |
| Auth             | JWT (access + refresh tokens)            |
| Validation       | class-validator + class-transformer      |
| Config           | @nestjs/config (plain factory functions) |
| Language context | cls-hooked (AsyncLocalStorage)           |
| Date             | dayjs                                    |

---

## 3. Architecture Decisions

### Single Company, Multiple Branches

- One company, multiple branches
- Every transaction table has `branch_id NOT NULL`
- Shared tables (products, partners, accounts, employees) have NO branch_id
- API middleware automatically scopes all queries to active branch

### Dual Database

- **PostgreSQL** — all transactional ERP data
- **MongoDB** — activity logs, notifications, chat messages, report cache

### Language

- All tables with name fields have TWO flat columns: `nameEn` and `nameAr`
- NO JSONB for bilingual fields
- API list responses return BOTH `nameEn` and `nameAr`
- Frontend resolves which to display

### Business Logic

- Follows Odoo patterns for all ERP modules
- Every financial event creates a balanced journal entry (DR = CR)
- Stock changes go through stock_moves, never direct quantity updates
- Invoices follow: draft → posted → paid lifecycle
- Sale orders follow: draft → confirmed → delivered → invoiced lifecycle

---

## 4. Folder Structure

```
src/
├── core/                          # App-wide infrastructure
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── storage.config.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── branch.guard.ts
│   │   └── roles.guard.ts
│   ├── middleware/
│   │   ├── lang.middleware.ts
│   │   ├── branch-scope.middleware.ts
│   │   └── audit-log.middleware.ts
│   ├── interceptors/
│   │   ├── response.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── decorators/
│       ├── current-user.decorator.ts
│       └── branch.decorator.ts
│
├── shared/                        # Cross-module shared logic
│   ├── shared.module.ts
│   ├── constants/
│   │   ├── status.enum.ts
│   │   ├── invoice-type.enum.ts
│   │   ├── journal-type.enum.ts
│   │   ├── stock-move-type.enum.ts
│   │   ├── payslip-status.enum.ts
│   │   └── magic-numbers.ts
│   ├── interfaces/
│   │   ├── paginated-result.interface.ts
│   │   ├── branch-scope.interface.ts
│   │   └── api-response.interface.ts
│   ├── utils/
│   │   ├── msg.util.ts
│   │   ├── lang.util.ts
│   │   ├── date.util.ts
│   │   ├── number.util.ts
│   │   └── sequence.util.ts
│   └── services/
│       ├── storage-shared.service.ts     # infrastructure
│       ├── settings.service.ts
│       ├── notification.service.ts
│       ├── email.service.ts
│       ├── cls.service.ts
│       ├── accounting.shared.ts          # anti-circular-dep shared logic
│       ├── inventory.shared.ts
│       ├── sales.shared.ts
│       ├── purchasing.shared.ts
│       ├── hr.shared.ts
│       ├── products.shared.ts
│       └── partners.shared.ts
│
├── database/                      # ALL entities, repositories, migrations
│   ├── database.module.ts
│   ├── sql/
│   │   ├── entities/              # TypeORM entities — one per table
│   │   ├── repositories/          # TypeORM repositories — one per entity
│   │   └── migrations/            # SQL migration files (structure + system seed data)
│   ├── mongo/
│   │   ├── schemas/               # Mongoose schemas
│   │   ├── repositories/          # Mongo repositories
│   │   └── indexes/               # MongoDB index definitions
│   └── seeders/
│       └── demo/                  # ONLY demo/dev data — never runs in production
│
├── modules/                       # Feature modules
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── interfaces/
│   ├── users/        (same structure)
│   ├── branches/     (same structure)
│   ├── roles/        (same structure)
│   ├── accounting/   (same structure)
│   ├── inventory/    (same structure)
│   ├── sales/        (same structure)
│   ├── purchasing/   (same structure)
│   ├── hr/           (same structure)
│   ├── payroll/      (same structure)
│   ├── crm/          (same structure)
│   ├── partners/     (same structure)
│   ├── products/     (same structure)
│   ├── settings/     (same structure)
│   └── reports/      (same structure)
│
└── i18n/
    ├── ar/
    │   ├── common.json
    │   ├── accounting.json
    │   ├── inventory.json
    │   ├── sales.json
    │   └── hr.json
    └── en/
        ├── common.json
        ├── accounting.json
        ├── inventory.json
        ├── sales.json
        └── hr.json
```

---

## 5. Forbidden Patterns — NEVER Violate These

| #   | Forbidden                                 | Correct                                        |
| --- | ----------------------------------------- | ---------------------------------------------- |
| 1   | `imports: [OtherModule]` between features | Use SharedModule                               |
| 2   | `@Inject('ServiceName')` string tokens    | Make it a shared service                       |
| 3   | Hardcoded strings `'active'`              | Use enums `Status.ACTIVE`                      |
| 4   | Inline interfaces in services             | Dedicated `interfaces/` folder                 |
| 5   | Business logic in controllers             | Only in services                               |
| 6   | Transactions in repositories              | Service-owned only                             |
| 7   | Raw SQL for CRUD                          | Repository methods                             |
| 8   | Magic numbers inline                      | Constants file                                 |
| 9   | English-only error messages               | Bilingual via `msg()`                          |
| 10  | `registerAs()` config                     | Plain factory functions                        |
| 11  | JSONB bilingual fields                    | Two flat columns `nameEn`/`nameAr`             |
| 12  | Direct file storage                       | S3 via `StorageSharedService`                  |
| 13  | `@Lang()` decorator                       | CLS context auto-resolves                      |
| 14  | Skip version check on update              | Always check optimistic lock                   |
| 15  | Cross-feature module imports              | Extract to `.shared.ts` in shared/services/    |
| 16  | Relative imports `../../`                 | Path alias `@/`                                |
| 17  | `name.en` accessor                        | Flat `nameEn` field                            |
| 18  | System seed data in seeder files          | Inside migration file alongside table creation |

---

## 6. Coding Conventions

### File Naming

```
{name}.module.ts
{name}.controller.ts
{name}.service.ts
{name}.repository.ts
{name}.entity.ts
{name}.schema.ts
{name}.dto.ts
{name}.interface.ts
{name}.enum.ts
{name}.shared.ts          ← shared service (anti-circular-dep)
```

### Class Naming

```typescript
// Modules
export class AccountingModule {}

// Controllers
export class AccountingController {}

// Services
export class AccountingService {}

// Shared services (anti-circular-dep)
export class AccountingShared {}

// Repositories
export class InvoiceRepository {}

// Entities
export class Invoice {}

// DTOs
export class CreateInvoiceDto {}
export class UpdateInvoiceDto {}
export class FilterInvoiceDto {}

// Interfaces
export interface InvoiceData {}

// Enums
export enum InvoiceStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}
```

### API Response Format

```typescript
// Every API response follows this shape
{
  success: true,
  data: {...} | [...],
  meta: {          // only for lists
    total: 150,
    page: 1,
    pageSize: 20
  },
  message: {
    en: 'Invoice created successfully',
    ar: 'تم إنشاء الفاتورة بنجاح'
  }
}

// Error response
{
  success: false,
  error: {
    code: 'INVOICE_NOT_FOUND',
    message: {
      en: 'Invoice not found',
      ar: 'الفاتورة غير موجودة'
    }
  }
}
```

### msg() Utility — Always Use for Error Messages

```typescript
// shared/utils/msg.util.ts
export const msg = (key: string): { en: string; ar: string } => {
  // reads from i18n/en/{module}.json and i18n/ar/{module}.json
};

// Usage
throw new NotFoundException(msg('accounting.invoice_not_found'));
throw new BadRequestException(msg('accounting.entry_not_balanced'));
```

### Branch Scope — Always Applied

```typescript
// Every service method that queries transactions MUST use branchId
async getInvoices(branchId: number, filters: FilterInvoiceDto) {
  return this.invoiceRepository.findAll({ branchId, ...filters })
}

// branchId comes from middleware, never from request body
// Use @CurrentBranch() decorator in controllers
```

### Sequence Generation — Always Atomic

```typescript
// Format: {PREFIX}/{BRANCH_CODE}/{YEAR}/{PADDED_NUMBER}
// Example: INV/CAI/2024/0001

await this.sequenceUtil.generate(branchId, 'invoice', trx);
```

---

## 7. Database Rules

### Migration Files

- Structure (CREATE TABLE) + system seed data (INSERT) in SAME file
- Named: `{number}_{action}_{table}.sql`
- Example: `001_create_company.sql` contains both CREATE TABLE and INSERT of default data
- Demo data ONLY in `seeders/demo/` — never in migrations

### Entity Rules

```typescript
// Every transaction entity MUST have branch_id
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'branch_id' }) // REQUIRED on all transaction tables
  branchId: number;

  @Column() // NEVER nameJson or name JSONB
  nameEn: string;

  @Column()
  nameAr: string;

  @Column({ name: 'status' })
  status: InvoiceStatus; // ALWAYS enum, never string literal

  @VersionColumn() // ALWAYS include for optimistic locking
  version: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Shared Tables (NO branch_id)

```
products, partners, accounts, employees,
journals, taxes, currencies, payment_terms,
departments, job_positions, salary_structures,
salary_rules, leave_types, units_of_measure,
product_categories, pricelists
```

### Transaction Tables (MUST have branch_id)

```
sale_orders, purchase_orders, invoices, payments,
stock_moves, stock_quants, warehouses, journal_entries,
journal_entry_lines, payslips, attendance, leave_requests,
leave_allocations, sequences, crm_leads
```

---

## 8. Module Rules

### Every Feature Module Structure

```
{module}/
├── {module}.module.ts
├── controllers/
│   └── {module}.controller.ts
├── services/
│   └── {module}.service.ts
├── dto/
│   ├── create-{module}.dto.ts
│   ├── update-{module}.dto.ts
│   └── filter-{module}.dto.ts
└── interfaces/
    ├── {module}.interface.ts
    └── {module}-status.enum.ts
```

### Anti-Circular-Dependency Rule

```
If module A needs logic from module B:
  1. Create shared/services/b.shared.ts
  2. Extract ONLY the needed methods into b.shared.ts
  3. Module A imports SharedModule → gets b.shared.ts
  4. Module A NEVER imports Module B directly

Example:
  SalesModule needs to post journal entries
  → accounting.shared.ts exposes postJournalEntry()
  → SalesModule uses AccountingShared from SharedModule
  → SalesModule does NOT import AccountingModule
```

---

## 9. Testing Strategy

Test each cycle before moving to the next:

```
Cycle 1  → Auth + Users + Branches + Roles         ← TEST
Cycle 2  → Products + Partners + Settings           ← TEST
Cycle 3  → Accounting                               ← TEST (most critical)
Cycle 4  → Inventory                                ← TEST
Cycle 5  → Sales + Invoicing                        ← TEST
Cycle 6  → Purchasing                               ← TEST
Cycle 7  → HR                                       ← TEST
Cycle 8  → Payroll                                  ← TEST
Cycle 9  → CRM                                      ← TEST
Cycle 10 → Reports + Dashboard                      ← TEST
```

---

## 10. Environment Variables

```bash
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=yusr_db

# MongoDB
MONGO_URI=mongodb://localhost:27017/yusr_logs

# JWT
JWT_SECRET=change_in_production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=change_in_production
JWT_REFRESH_EXPIRES_IN=7d

# Storage (S3)
STORAGE_PROVIDER=local
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_REGION=
```

---

## 11. Current Build Status

```
Cycle 1 — COMPLETE (builds with zero errors)
  ✅ Project initialized
  ✅ Folder structure created
  ✅ Dependencies installed
  ✅ Core infrastructure (config, guards, middleware, interceptors, filters, pipes, decorators)
  ✅ DatabaseModule (TypeORM + Mongoose)
  ✅ 7 Entities (Company, Branch, User, UserBranch, Role, RolePermission, Sequence)
  ✅ 7 Repositories (with pagination, optimistic locking, special methods)
  ✅ SharedModule (12 services, 6 enums, 3 interfaces, 5 utils)
  ✅ AuthModule (login, refresh, JWT strategy)
  ✅ UsersModule (CRUD, branch assignment, my-branches)
  ✅ BranchesModule (CRUD, auto-sequence creation)
  ✅ RolesModule (CRUD, permission assignment)
  ✅ Migrations 001-007 (tables + seed data + foreign keys)
  ✅ i18n (10 JSON files: ar + en for common, accounting, inventory, sales, hr)

Cycle 2 — NOT STARTED
  ⏳ Products + Partners + Settings
```

Update this section as cycles are completed.
