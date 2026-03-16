# CLAUDE.md — Project Rules

> These rules are **non-negotiable**. Every rule here must be followed on every task, every file, every time — no exceptions.

---

## Stack

- **Framework:** NestJS 10 + TypeScript 5 (strict mode)
- **ORM:** Sequelize (sequelize-typescript)
- **Database:** PostgreSQL 16 — schema-per-tenant multi-tenancy
- **Cache:** Redis (ioredis) — separate instances for cache (6379) and queues (6380)
- **Queues:** Bull (Redis-backed)
- **Path alias:** `@/` maps to `src/`

---

## Workflow Rules

- Run `pnpm format` before every `git push` — mandatory, no exceptions
- Use conventional commits — enforced via commitlint + husky
- Config files must use plain factory functions — never `registerAs()` style

---

## Git Branching

- **Main branch:** `prod` — protected, never push directly
- **Integration branch:** `dev` — all PRs target `dev`
- **Branch prefixes:** `feat/`, `fix/`, `hotfix/`, `chore/`, `refactor/`
- **Naming:** lowercase kebab-case — e.g. `feat/invoice-export`
- Branch from `dev`, PR into `dev`
- Hotfixes branch from `prod` and must be merged into both `prod` and `dev`
- Delete branches after merge

---

## Module Structure

Every module follows this layout — no exceptions:

```
modules/<module>/
├── controllers/           # Route handlers — no business logic
├── services/              # Business logic — owns transactions
├── dto/                   # Validation classes — never inline in services/controllers
├── interfaces/            # TypeScript interfaces — never inline in services/controllers
└── <module>.module.ts     # Imports repositories from @/database/sql/repositories
```

- Controllers call services, services call repositories — never skip layers
- Only export services needed by other modules

---

## Base Entity & Models

All entities extend `TenantAwareEntity<T>` (tenant-scoped) or `BaseEntity<T>` (global).

### Auto-provided Columns

| Column      | Type         | Notes                                               |
| ----------- | ------------ | --------------------------------------------------- |
| `id`        | UUID         | Generated via `uuidv7()` — never use auto-increment |
| `createdAt` | Date         | Sequelize `@CreatedAt`                              |
| `updatedAt` | Date         | Sequelize `@UpdatedAt`                              |
| `deletedAt` | Date \| null | Sequelize `@DeletedAt` — soft delete                |
| `createdBy` | UUID \| null | Set from `AuditContext`                             |
| `updatedBy` | UUID \| null | Set from `AuditContext`                             |
| `version`   | number       | Optimistic locking — default `0`                    |
| `tenantId`  | UUID         | `TenantAwareEntity` only — `allowNull: false`       |

### Rules

- Every model must use `@Table({ paranoid: true })` — soft delete by default
- Never hard delete unless explicitly required (use `softDelete()`)
- Status columns must be typed with their enum — never bare `string`
- All `@ForeignKey` columns use UUID type with explicit `onDelete` behavior

---

## Optimistic Locking

Every model has a `version` field (default `0`).

- Update DTOs must include `version: number` — the client sends back the version it read
- Repository `update()` checks `WHERE id = :id AND version = :version`
- Throws `ConflictException` on version mismatch — the client must re-fetch and retry
- Never skip the version check on updates — it prevents lost writes

---

## Repository Pattern

All repositories extend `BaseRepository<T>` from `src/database/sql/base.repository.ts`.

### Rules

- Repositories contain **zero business logic** — only data access
- Never create, commit, or rollback transactions in a repository
- Tenant isolation is automatic via `resolveTenantFilter()` — throws `ForbiddenException` if `tenantScoped=true` and no `tenantId` provided
- Use `bypassTenantScope: true` only for admin/system operations
- Raw queries (`rawQuery()`) are allowed **only** for CTEs, aggregations, and atomic numeric updates — never for standard CRUD

### Standard Methods

| Method                                          | Description                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `findAll(options)`                              | Returns `PaginatedResult<T>` — auto-handles search, sort, pagination |
| `findOne(options)`                              | Returns `T \| null`                                                  |
| `findById(id, options)`                         | Returns `T` — throws `NotFoundException` if missing                  |
| `findByIdOrNull(id, options)`                   | Returns `T \| null`                                                  |
| `create(data, options)`                         | Returns created `T`                                                  |
| `update(id, data, options)`                     | Returns updated `T` — checks `version`                               |
| `softDelete(id, options)`                       | Sets `deletedAt`                                                     |
| `hardDelete(id, options)`                       | Permanent delete — `force: true`                                     |
| `restore(id, options)`                          | Restores soft-deleted record                                         |
| `bulkCreate(options)`                           | Bulk insert                                                          |
| `bulkUpdate(options)`                           | Bulk update                                                          |
| `rawQuery<R>(sql, replacements?, transaction?)` | For CTEs/aggregations only                                           |
| `createTransaction({ transaction? })`           | Reuses existing or creates new                                       |

---

## Transactions

Transactions are **owned by the service layer**. Repositories never create, commit, or rollback transactions — they only receive and forward them.

### Creating a Transaction

Use `createTransaction()` on any injected repository. It reuses an existing transaction if one is passed in, or creates a new one.

```typescript
async someServiceMethod(
  tenantId: string,
  dto: SomeDto,
  auditContext: AuditContext,
  containerTransaction?: Transaction,
) {
  const isOwner = !containerTransaction;
  const transaction = await this.someRepository.createTransaction({
    transaction: containerTransaction,
  });

  try {
    await this.someRepository.update(id, data, { tenantId, transaction, auditContext });
    await this.otherRepository.create(data, { tenantId, transaction, auditContext });

    // Nested service call — passes transaction down, does NOT commit
    await this.otherService.doSomething(tenantId, data, auditContext, transaction);

    if (isOwner) await transaction.commit();
  } catch (e) {
    if (isOwner) await transaction.rollback();
    throw e; // Always rethrow — never swallow errors
  }
}
```

### Rules

- `isOwner = !containerTransaction` — only the creator commits and rolls back
- Always `throw e` after rollback — never swallow errors silently
- If `containerTransaction` is passed in → skip commit/rollback, let the parent own it
- Never start a transaction inside a repository method
- After a successful commit, use compensating transactions for reversals — never try to rollback a committed transaction

### When to Use Transactions

Use a transaction any time two or more DB operations must succeed or fail together:

- Checkout: update order + insert payments + deduct stock + earn points
- Payroll approval: update run status + insert journal entry
- Refund: update original order + create refund order + restore stock + reverse points
- Transfer: deduct from source + add to destination

Single-operation methods (simple create, update, soft delete) do **not** need a transaction.

---

## Outbox Pattern

Domain events are published via a transactional outbox — never emit events outside a transaction.

### How It Works

1. Write the event to `outbox_events` table **inside the same transaction** as the business operation
2. A Bull processor polls for pending events and dispatches them to handler services
3. Failed events retry with exponential backoff (1s → 2s → 4s → 8s → 16s), max 5 attempts, then marked `dead`

### Usage

```typescript
await this.outboxSharedService.createEvent(
  transaction, tenantId, 'ORDER_COMPLETED', payload, referenceId?, referenceType?
);
```

### Rules

- Always create outbox events inside the business transaction — never after commit
- Event handlers are registered in `OutboxProcessor.handlerMap`
- Only active tenants' events are processed

---

## API Response Format

All responses are automatically wrapped by `ResponseInterceptor`. Never manually construct response envelopes.

### Success

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
  "timestamp": "2026-03-14T...",
  "lang": "en"
}
```

`meta` is included only for paginated responses.

### Error

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "...", "statusCode": 404 },
  "timestamp": "2026-03-14T...",
  "path": "/api/v1/..."
}
```

### i18n Field Flattening

JSONB columns with `{ en: string, ar: string }` are automatically flattened to a single string based on the `Accept-Language` header. No manual flattening needed in services.

---

## Pagination

Standard paginated response shape used everywhere:

```typescript
interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

- Defaults: `page=1`, `limit=20`, max `limit=100`
- Use `PaginationDto` from `src/common/dto/` for query params
- `BaseRepository.findAll()` handles pagination, search, and sorting automatically
- JSONB search: auto-searches both `en` and `ar` keys independently

---

## Guards & Decorators

### Custom Decorators

| Decorator                       | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `@Permissions('module:action')` | Sets required permissions — checked by `PermissionsGuard` |
| `@CurrentUser()`                | Injects authenticated user from request                   |
| `@TenantId()`                   | Injects tenant ID from request                            |
| `@Public()`                     | Skips JWT authentication                                  |
| `@Idempotent()`                 | Requires `Idempotency-Key` header — caches response       |
| `@CacheResponse(ttlSeconds)`    | Caches GET response in Redis                              |
| `@RequireFeature(name)`         | Checks feature flag before execution                      |

### Guards (applied globally)

`JwtAuthGuard` → `TenantStatusGuard` → `SubscriptionGuard` → `PermissionsGuard` → `FeatureFlagGuard`

---

## Caching

Redis-based via `CacheService`. Disabled gracefully if Redis is unavailable.

### TTL Presets

| Key             | TTL           |
| --------------- | ------------- |
| `dropdown`      | 300s (5 min)  |
| `dashboard`     | 60s (1 min)   |
| `reports`       | 600s (10 min) |
| `permissions`   | 300s (5 min)  |
| `exchangeRates` | 3600s (1 hr)  |

### Key Conventions

- Permissions: `perm:{tenantSlug}:{userId}`
- Tenant config: `tenant:config:{tenantSlug}`
- Refresh tokens: `refresh:{userId}:{tokenId}`

### Rules

- Use `@CacheResponse(ttl)` on read-only GET endpoints — never on mutations
- Invalidate relevant cache keys after writes
- Never cache tenant-scoped data without including `tenantId` in the key

---

## Shared Services

Cross-cutting concerns live in `src/shared/services/` — injected globally, available everywhere.

| Service                         | Purpose                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `AuditSharedService`            | Structured audit logging (`logCreate`, `logUpdate`, `logDelete`, `logStatusChange`) |
| `OutboxSharedService`           | Transactional event creation                                                        |
| `TaxSharedService`              | Tax calculations (discount applied before tax)                                      |
| `FinancialSharedService`        | Accounting helpers                                                                  |
| `NotificationSharedService`     | Notification dispatch                                                               |
| `StatusTransitionSharedService` | State machine transition validation                                                 |
| `EncryptionSharedService`       | Encrypt/decrypt sensitive data                                                      |
| `PdfSharedService`              | PDF generation                                                                      |
| `StorageSharedService`          | S3 file upload/download                                                             |
| `DateSharedService`             | Date formatting with i18n                                                           |
| `IdempotencySharedService`      | Idempotent request handling                                                         |
| `UserLookupSharedService`       | User/admin lookup by ID                                                             |
| `LoyaltySharedService`         | Loyalty earn, redeem, reverseEarn — used by POS checkout and refunds                |
| `VoucherGiftCardSharedService`  | Voucher validation/redemption + gift card redemption — used by POS checkout         |
| `JournalPosterSharedService`   | Auto-post journal entries for POS, payroll, treasury transactions                   |

### When to Use Shared Services

Use a shared service when **business logic needs to be called from multiple modules**. This avoids module-to-module imports (`imports: [OtherModule]`) and `@Optional()/@Inject('string-token')` patterns.

**Use shared services for:**
- Domain operations needed across module boundaries (loyalty earn/redeem, journal posting, voucher validation)
- The logic lives in the shared service; the module-level service delegates to it
- Any module can inject the shared service directly — no imports needed (`SharedModule` is `@Global()`)

**Do NOT use shared services for:**
- Module-internal logic that only one module uses (e.g., `AccountsService` in accounting)
- Stateless utilities that don't need repositories — use plain helper functions instead

### Pattern

```typescript
// 1. Create shared service in src/shared/services/
@Injectable()
export class FooSharedService {
  constructor(private readonly fooRepository: FooRepository) {} // repositories are global
  async doSomething(...) { /* logic here */ }
}

// 2. Register in SharedModule (src/shared/shared.module.ts)
const services = [..., FooSharedService];

// 3. Module-level service delegates to shared
@Injectable()
export class FooService {
  constructor(private readonly fooShared: FooSharedService) {}
  async doSomething(...) { return this.fooShared.doSomething(...); }
  async moduleOnlyMethod(...) { /* stays here */ }
}

// 4. Other modules inject shared service directly — no module import needed
@Injectable()
export class BarService {
  constructor(private readonly fooShared: FooSharedService) {} // globally available
}
```

**Rule:** Never use `@Optional() @Inject('ServiceName')` string tokens. If a service is needed across modules, make it a shared service.

---

## DTOs

### Rules

- All DTOs live in the module's `dto/` folder — never inline in services or controllers
- Use `@ApiProperty()` / `@ApiPropertyOptional()` on every field for Swagger documentation
- Use `@IsEnum(EnumName)` — never `@IsIn([...])` with hardcoded arrays
- Nested objects: `@ValidateNested({ each: true })` + `@Type(() => NestedDto)`
- Update DTOs must include `version: number` for optimistic locking
- Global validation pipe: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`

---

## Enums

All status, type, method, and action values **must** use enums from `src/common/enums/`.

- Never hardcode a string like `'open'`, `'paid'`, `'cash'`, `'storable'` anywhere in the codebase
- Before writing any new value: check if the enum exists in `src/common/enums/` — if not, add it first, then use it
- DTOs must use `@IsEnum(EnumName)` — never `@IsIn([...])` with hardcoded arrays
- Models must type columns with the enum
- Services use `EnumName.VALUE`

### Enum File Organization

| File                    | Enums                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pos.enums.ts`          | PosOrderStatus, PosSessionStatus, PaymentMethod, OrderType, CashMovementType, OverrideStatus, ManagerOverrideAction, LoyaltyTransactionType, LoyaltyAdjustAction, ProductType, InvoicePolicy, VoucherType, DiscountType, GiftCardTransactionType, RefundType, KitchenTicketStatus, CourseType, TableStatus |
| `crm.enums.ts`          | LeadStatus, LeadSource, LeadPriority, SalesOrderStatus, ContactRole, ContactType, InvoiceType, TransactionType, SupplyType, TaxCategory, SalesDiscountType                                                                                                                                                 |
| `hr.enums.ts`           | EmploymentStatus, EmploymentType, LeaveType, LeaveStatus                                                                                                                                                                                                                                                   |
| `inventory.enums.ts`    | StockMovementType, StockReferenceType, ProductStatus                                                                                                                                                                                                                                                       |
| `purchasing.enums.ts`   | PurchaseOrderStatus, VendorStatus                                                                                                                                                                                                                                                                          |
| `project.enums.ts`      | ProjectStatus, TaskStatus, TaskPriority                                                                                                                                                                                                                                                                    |
| `ticket.enums.ts`       | TicketStatus, TicketPriority, TicketReplySender                                                                                                                                                                                                                                                            |
| `subscription.enums.ts` | SubscriptionStatus, BillingCycle, PaymentVerificationStatus                                                                                                                                                                                                                                                |
| `notification.enums.ts` | NotificationChannel                                                                                                                                                                                                                                                                                        |
| `sequence.enums.ts`     | SequenceEntity, ResetCycle                                                                                                                                                                                                                                                                                 |
| `chat.enums.ts`         | ChatRoomType, ChatMessageType                                                                                                                                                                                                                                                                              |
| `tenant.enums.ts`       | TenantStatus, TenantNotePriority                                                                                                                                                                                                                                                                           |
| `user.enums.ts`         | ConsentType                                                                                                                                                                                                                                                                                                |
| `reporting.enums.ts`    | ReportGranularity, ReportModule, ExportFormat                                                                                                                                                                                                                                                              |
| `release.enums.ts`      | ReleaseNoteType, TooltipPosition, ReleaseType                                                                                                                                                                                                                                                              |
| `status.enum.ts`        | CommonStatus, ApprovalStatus, PaymentStatus, InvoiceStatus, OrderStatus (+ re-exports from domain files)                                                                                                                                                                                                   |

---

## Error Messages

Every error message must be **bilingual (Arabic + English)**.

- All messages live in `src/common/i18n/errors.i18n.ts` — add new ones there, never inline
- Use `msg(ErrorMessages.KEY, ...args)` — language is resolved automatically from CLS context
- Never pass `lang` as a parameter to services or `msg()`
- Every message must include the actual value that caused the error
- Never throw bare English-only strings
- Never use vague messages under 5 words

---

## Bilingual Fields (i18n Columns)

All user-facing text columns (names, titles, descriptions, etc.) must support **English + Arabic** as **two separate columns** — never JSONB.

### Database — Two Columns

Every bilingual field gets two columns
EX:
nameEn , nameAR
descriptionEn , descriptionAR

```typescript
// Migration
nameEn: { type: DataTypes.STRING(255), allowNull: false },
nameAr: { type: DataTypes.STRING(255), allowNull: false },

// Entity
@Column({ type: DataType.STRING(255), allowNull: false })
nameEn!: string;

@Column({ type: DataType.STRING(255), allowNull: false })
nameAr!: string;
```

### DTOs — Direct Match

DTO fields map directly to model columns — no transformation needed:

```typescript
// Create DTO — both required
@IsString()
nameEn!: string;

@IsString()
nameAr!: string;

// Update DTO — both optional
@IsOptional()
@IsString()
nameEn?: string;

@IsOptional()
@IsString()
nameAr?: string;
```

### Services — No Mapping

DTO fields pass straight through to the repository — no JSONB conversion:

```typescript
// Create — spread directly
await this.repository.create({ ...dto, tenantId }, { tenantId, transaction, auditContext });

// Update — spread directly, repository handles partial updates
await this.repository.update(id, { ...dto }, { tenantId, transaction, auditContext });
```

### Rules

- **Never** use JSONB `{ en, ar }` for new bilingual fields — always two separate columns
- Existing JSONB bilingual fields will be migrated to two columns over time
- Column naming: `nameEn` / `nameAr` in DB (camelCase), `nameEn` / `nameAr` in model/DTO (camelCase)
- Never hardcode UI-facing strings — always provide both languages
- Field naming convention: `nameEn`/`nameAr`, `titleEn`/`titleAr`, `descriptionEn`/`descriptionAr`
- DB tables names are snake_case
---

## Request-Scoped Context (CLS)

Language and request-scoped values are stored in CLS (`nestjs-cls`) — never passed as parameters.

- `ClsModule` is configured globally in `app.module.ts` with middleware that reads the `Accept-Language` header
- Store type: `src/common/context/app-cls.store.ts` (`AppClsStore`)
- `msg()` reads `lang` from CLS automatically — no `lang` parameter needed anywhere
- Fallback: defaults to `'en'` when CLS is unavailable (bootstrap, background jobs)
- **Never** add `lang` parameters to controllers or services
- **Never** use the `@Lang()` decorator — it has been removed

---

## Service Method Signatures

Standard parameter order:

```
methodName(tenantId, ...domainParams, dto?, auditContext?, containerTransaction?)
```

Every method in a transaction chain must accept `containerTransaction?: Transaction`.

---

## Constants

Every business rule number must be a named constant in `src/common/constants/`.

Examples: `MAX_PIN_ATTEMPTS`, `PIN_LOCKOUT_MINUTES`, `VAT_RATE`, `MAX_HELD_ORDERS`

Never use magic numbers inline anywhere in the codebase.

---

## Multi-Currency

### Overview

The system supports multi-currency via `currencies` and `exchange_rates` tables. Each tenant has exactly one base (functional) currency, enforced by a partial unique index on `isBase = true`.

### Currency Module

- `src/modules/currency/currency.module.ts` — decorated `@Global()`, auto-available everywhere
- Inject `CurrencyService` directly — no token string needed

### Rules

- All monetary amounts stored in the DB are in the **base currency**
- Foreign currency amounts are stored alongside a `currencyId` and `exchangeRate` snapshot taken at transaction time
- Exchange rates are looked up by `(tenantId, fromCurrencyId, toCurrencyId, rateDate)` — falls back to the most recent rate on or before the requested date
- POS orders default to the tenant base currency when no `currencyId` is provided at checkout
- The `currency` VARCHAR column on `sales_orders` and `purchase_orders` is kept for backward compatibility — new code must populate `currencyId` instead
- Never store a string currency code on new tables — always use a FK to `currencies.id`

### CurrencyService Methods

| Method                                        | Description                                                    |
| --------------------------------------------- | -------------------------------------------------------------- |
| `getBaseCurrency(tenantId)`                   | Returns the base currency — throws if none configured          |
| `getRate(tenantId, fromId, toId, date?)`      | Returns rate — falls back to most recent, throws if none found |
| `toBase(tenantId, amount, currencyId, date?)` | Converts to base currency, returns `{ amount, rate }`          |
| `convert(amount, rate)`                       | Pure helper — rounds to 2 decimal places                       |

---

## Interfaces

All TypeScript interfaces must live in a dedicated `interfaces/` folder within their module.

- File naming: `src/modules/<module>/interfaces/<module>.interfaces.ts`
- **Never** define `export interface` inside a service, controller, or processor file
- Import interfaces into services/controllers from the interfaces file
- Shared cross-cutting interfaces (e.g. `AuditContext`) live in `src/common/interfaces/`

---

## Seed Data

All seed files live under `src/database/sql/` in one of two dedicated folders. **Never** place seed files inside module folders or anywhere else.

### Folder Structure

```
src/database/sql/
├── migrations/             # All migrations (flat) — schema + seed-data migrations
├── seeders/                # Test seeders only — complete dataset for dev/staging
│   ├── XX-name.seed.ts     # Numbered test seeders
│   └── saudi-coa.seed.ts   # Data-only export (imported by AccountsService)
└── scripts/
    ├── migrate.ts          # Umzug migration runner
    └── seed.ts        # Flushes DB → runs test seeders only
```

### System / Default Data

System default data (plans, super admin, etc.) is handled as **seed-data migrations** — regular migration files with idempotency checks. They run automatically with `pnpm migration:up` alongside schema migrations. No separate `seed` command needed.

- Must be idempotent — check existence before insert
- Named with `seed-` prefix: `YYYYMMDDHHMMSS-seed-description.ts`
- Placed after all table-creation migrations in timestamp order

### Scripts

| Script     | Command                 | What it does                                                                                          |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Migrations | `pnpm migration:up` | Runs all migrations (schema + seed-data) — idempotent, safe for all environments                      |
| Test seed  | `pnpm seed`          | Flushes entire DB → runs test seeders only — **non-production only**, aborts if `NODE_ENV=production` |

### Test Seeders — `src/database/sql/seeders/`

These contain the **complete dataset for a fresh dev/staging database** — they are a superset of system data. They include all system default records plus additional demo and testing data.

- **Strictly forbidden in production** — script aborts immediately if `NODE_ENV=production`
- The script **always flushes the entire database first** — no partial or mixed states
- Test seeders own the full dataset: system defaults + demo/test data in one place
- Numbered for execution order: `XX-name.seed.ts` (e.g. `01-plans.seed.ts`)
- No idempotency checks needed — flush guarantees a clean slate before every run
- Data-only exports with no DB logic (imported by services) use unnumbered naming: `name.seed.ts` (e.g. `saudi-coa.seed.ts`)

### Living Rule — Keep Migrations & Seeders in Sync

**Migrations and seeders are part of the feature — not an afterthought. They must stay in sync with the codebase at all times.**

- New module added → add schema migration + seed-data migration (if needed) + test seeder data
- New required column added to a model → update relevant migrations and test seeders
- Enum value added or renamed → update all seed-data migrations and test seeders that reference it
- Never merge a feature that leaves migrations or seeders broken or out of date

### General Rules

- Never define large static data arrays inside a service, controller, or module file — extract to a seed file or seed-data migration
- Services may import data-only seed files and handle the DB writes (idempotency check, transaction, etc.)
- API test runners and utility scripts go in `src/scripts/` — not in the seeders folder

---

## Sequence Generation

Auto-numbering for business documents (invoices, orders, etc.) via `SequencesService`.

- **Atomic:** Uses `SELECT FOR UPDATE` + transaction to prevent race conditions
- **Format:** `PREFIX-BRANCHCODE-PADDEDVALUE` (e.g. `SO-00001`, `PO-BR001-00042`)
- **Reset cycles:** `NEVER`, `YEARLY`, `MONTHLY` — tracked with `fiscalYear`/`fiscalMonth` fields
- **Core method:** `nextNumber(tenantId, entity, branchId?): Promise<string>`
- ZATCA sequences cannot be manually reset
- Branch-level sequences are cloned from company-wide defaults via `cloneForBranch()`

---

## File Storage

S3-based via `StorageSharedService`. Disabled if `STORAGE_ENABLED !== 'true'`.

| Method                                        | Description                 |
| --------------------------------------------- | --------------------------- |
| `upload(buffer, mimeType, folder, filename?)` | Returns S3 key              |
| `getSignedUrl(key, expiresInSeconds?)`        | Returns pre-signed GET URL  |
| `delete(key)`                                 | Deletes from S3             |
| `getPublicUrl(key)`                           | Constructs public HTTPS URL |

- Key format: `${folder}/${filename || uuid()}`
- Never store files locally — always use S3

---

## Tenant Provisioning

New tenants are provisioned by `TenantProvisionerService`.

### In-transaction (tenant creation fails if any of these fail)

| Step | Data | Details |
|------|------|---------|
| 1–7 | RBAC, admin user, branch | Existing — permissions, roles, user, user-tenant mapping, HQ branch |
| 10 | SAR base currency | `isBase: true`, code: SAR |
| 11 | 26 Saudi COA accounts | From `src/common/defaults/saudi-coa.defaults.ts` |
| 12 | 15 COA account ID settings | Maps `coaCash`, `coaSalesRevenue`, etc. to account UUIDs in `tenant_settings` |
| 13 | 6 general settings | `fiscalYearStartMonth`, `defaultCurrency`, `salaryCalculationBasis`, `timezone`, `vatRate`, `allowNegativeStock` |
| 14 | 12 fiscal periods | Current calendar year, all status `open` |
| 15 | Default warehouse | "Main Warehouse", linked to HQ branch |
| 16 | Default department | "General" |
| 17 | Default shift | "Morning", Sun–Thu 08:00–16:00 |
| 18 | Default treasury cash account | Linked to COA 1100 + HQ branch |

### Post-commit (best-effort — logged if they fail, don't block tenant creation)

| Step | Data | Details |
|------|------|---------|
| 8–9 | Sequences + subscription | Existing — 8 default sequences + trial subscription |
| 19 | 13 notification templates | POS, loyalty, stock, HR, sales, purchasing, ZATCA |
| 20 | USD currency + exchange rates | SAR↔USD = 3.75 |
| 21 | Default product category | "General" |
| 22 | Default cost center | "General" (CC-001) |

### Rules

- Never seed this data manually — the provisioner handles it automatically
- For repair after provisioning failures: `POST /accounting/accounts/repair` (admin only, idempotent)
- COA defaults live in `src/common/defaults/saudi-coa.defaults.ts` — not in seeders
- Backfill existing tenants: `pnpm exec ts-node -r tsconfig-paths/register src/scripts/backfill-provisioning.ts`

---

## VAT / Tax approach

The system uses a simple flat-rate tax model — not a full tax engine.

Rules:
- taxRate stored on the product as DECIMAL (default: 15)
- Copied to order lines at order creation time
- tax = ROUND((lineTotal - lineDiscount) * taxRate / 100, 2) per line
- All VAT posts to the single coaVatPayable GL account
- taxCategory defaults to S (standard 15%) on all orders
- A single invoice cannot have mixed tax categories in the current version

Not supported (by design, not by accident):
- Zero-rated exports (taxCategory Z)
- Exempt products (taxCategory E)
- Per-product GL accounts for tax
- Price-inclusive tax (tax already in unit price)
- Multiple tax rates on the same invoice

---

## Input VAT on purchases

Saudi VAT on purchases is recoverable input tax.
The current implementation posts the full purchase amount net of VAT to Inventory
and does not separately track input VAT.

When input VAT tracking is needed:
- Add account 1600 Input VAT Recoverable to COA defaults
- Add coaInputVat to COA_SETTING_KEY_MAP
- Update PurchaseOrderService.invoice() to split the DR:
    DR Inventory = subtotalBase
    DR Input VAT = taxAmountBase
    CR Accounts Payable = totalAmountBase

---

## Scheduled jobs

The system uses @nestjs/schedule with three daily cron jobs:

ContractExpiryJob — 01:00 AST daily
  Auto-sets employee contract status to EXPIRED when endDate passes
  Notifies HR manager via outbox event

TicketAutoCloseJob — 02:00 UTC daily
  Auto-closes support tickets that have been RESOLVED for 7+ days with no reply
  Adds a SYSTEM reply explaining the auto-close

PointsExpiryJob — 03:00 UTC daily
  Expires loyalty points where expiresAt < today
  Atomically reduces account balance
  Notifies customer via push notification

---

## Releases module

The releases table is global (no tenantId) — all tenants see the same releases.
Public endpoints /releases/* require no authentication.
Admin endpoints /admin/releases/* require admin auth.
Version format: semantic versioning X.Y.Z validated on create.
isPublished = false by default — requires explicit publish action.

---

## Tenant config API

Structured settings grouped by domain: /config/general, /config/accounting,
/config/hr, /config/pos, /config/zatca
All reads go through UnifiedSettingsService (with 5-min cache).
All writes go through TenantSettingsRepository.upsertSetting() + cache invalidation.
ZATCA sensitive fields (csid, privateKey, certificate) are write-only —
GET /config/zatca returns csidConfigured: true/false, never the actual value.

---

## Multi-currency rules

Base currency is SAR per tenant — currencies table, isBase = true.
Every monetary transaction stores: currencyId, amount, amountBase (SAR), exchangeRate.
CurrencyService is global — inject anywhere.
Reports always aggregate amountBase — never SUM mixed currencies.
Loyalty earn always on base currency amount.
Gift card currency must match order currency — no cross-currency redemption.
Exchange rate locked at transaction time — never recalculated retroactively.

---

## Settings architecture

Two tiers: SystemSettings (global) and TenantSettings (per-tenant).
UnifiedSettingsService: tries tenant first, falls back to system, then hardcoded default.
5-minute in-memory cache with invalidation on write.
Direct TenantSettingsRepository injection is allowed in domain services for writes.
For reads: always use UnifiedSettingsService.get() / getNumber() / getBoolean() / getMany().
Sensitive settings (ZATCA keys): write via TenantConfigService only, never return raw value.
