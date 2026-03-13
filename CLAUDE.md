# CLAUDE.md — Project Rules

## Workflow Rules
- **Always run `npm run format` before pushing code** — this is mandatory before every `git push`
- Use conventional commits (commitlint + husky enforced)
- Config files must use plain factory functions (NOT `registerAs()` style)

## Git Branching
- **Main branch:** `prod` (protected — never push directly)
- **Branch prefixes:** `feat/`, `fix/`, `hotfix/`, `chore/`, `refactor/`
- Branch names: lowercase, kebab-case (e.g., `feat/invoice-export`)
- Always branch from `dev`, PR into `dev`
- Hotfixes branch from `prod`, merge into both `prod` and `dev`
- Delete branches after merge

## Project
- NestJS 10 + TypeScript 5 strict + Sequelize ORM + PostgreSQL
- Multi-tenant via PostgreSQL schema-per-tenant
- Path alias: `@/` maps to `src/`

---

## Transaction pattern

Transactions are always created and owned by the **service layer**.
Repositories never create, commit, or rollback transactions — they only receive and forward them.

### Creating a transaction

Use `createTransaction()` on any injected repository.
It reuses an existing transaction if one is passed in (nested call), or creates a new one.

```typescript
async someServiceMethod(
  tenantId: string,
  dto: SomeDto,
  auditContext: AuditContext,
  containerTransaction?: Transaction,   // optional — for nested service calls
) {
  const isOwner = !containerTransaction;
  const transaction = await this.someRepository.createTransaction({
    transaction: containerTransaction,
  });

  try {
    await this.someRepository.update(id, data, { tenantId, transaction, auditContext });
    await this.otherRepository.create(data, { tenantId, transaction, auditContext });

    // nested service call — passes transaction down, does NOT commit
    await this.otherService.doSomething(tenantId, data, auditContext, transaction);

    if (isOwner) await transaction.commit();
  } catch (e) {
    if (isOwner) await transaction.rollback();
    throw e;   // always rethrow — never swallow errors
  }
}
```

### Rules

- `isOwner = !containerTransaction` — only the creator commits and rolls back
- Always `throw e` after rollback — never swallow errors silently
- If `containerTransaction` is passed in → skip commit/rollback, let the parent own it
- Never start a transaction inside a repository method
- After a successful commit, use compensating transactions for reversals (refunds, reversals) — never try to rollback a committed transaction

### When to use transactions

Use a transaction any time two or more DB operations must be atomic:
- Checkout: update order + insert payments + deduct stock + earn points
- Payroll approval: update run status + insert journal entry
- Refund: update original order + create refund order + restore stock + reverse points
- Transfer: deduct from source account + add to destination account

Single-operation methods (simple create, update, soft delete) do NOT need a transaction.

---

## Enums — Non-negotiable

All status, type, method, and action values must use enums from `src/common/enums/`.
Never hardcode a string like `'open'`, `'paid'`, `'cash'`, `'storable'` anywhere in the codebase.
Before writing any new value: check if enum exists in `src/common/enums/`, if not add it first, then use it.
DTOs must use `@IsEnum(EnumName)` — never `@IsIn([...])` with hardcoded arrays.
Models must type columns with the enum. Services use `EnumName.VALUE`.

### Enum file organization

Enums are organized by domain in `src/common/enums/`:

| File | Enums |
|------|-------|
| `pos.enums.ts` | PosOrderStatus, PosSessionStatus, PaymentMethod, OrderType, CashMovementType, OverrideStatus, ManagerOverrideAction, LoyaltyTransactionType, LoyaltyAdjustAction, ProductType, InvoicePolicy, VoucherType, DiscountType, GiftCardTransactionType, RefundType, KitchenTicketStatus, CourseType, TableStatus |
| `crm.enums.ts` | LeadStatus, LeadSource, LeadPriority, SalesOrderStatus, ContactRole, ContactType, InvoiceType, TransactionType, SupplyType, TaxCategory, SalesDiscountType |
| `hr.enums.ts` | EmploymentStatus, EmploymentType, LeaveType, LeaveStatus |
| `inventory.enums.ts` | StockMovementType, StockReferenceType, ProductStatus |
| `purchasing.enums.ts` | PurchaseOrderStatus, VendorStatus |
| `project.enums.ts` | ProjectStatus, TaskStatus, TaskPriority |
| `ticket.enums.ts` | TicketStatus, TicketPriority, TicketReplySender |
| `subscription.enums.ts` | SubscriptionStatus, BillingCycle, PaymentVerificationStatus |
| `notification.enums.ts` | NotificationChannel |
| `sequence.enums.ts` | SequenceEntity, ResetCycle |
| `chat.enums.ts` | ChatRoomType, ChatMessageType |
| `tenant.enums.ts` | TenantStatus, TenantNotePriority |
| `user.enums.ts` | ConsentType |
| `reporting.enums.ts` | ReportGranularity, ReportModule, ExportFormat |
| `release.enums.ts` | ReleaseNoteType, TooltipPosition, ReleaseType |
| `status.enum.ts` | CommonStatus, ApprovalStatus, PaymentStatus, InvoiceStatus, OrderStatus (+ re-exports from domain files) |

## Error Messages — Non-negotiable

Every error message must be bilingual (Arabic + English).
All messages live in `src/common/i18n/errors.i18n.ts` — add new ones there, never inline.
Use `msg(ErrorMessages.KEY, ...args)` — language is resolved automatically from CLS context.
Never pass `lang` as a parameter to services or `msg()`. The CLS middleware handles it.
Every message must include the actual value that caused the error.
Never throw bare English-only strings. Never use vague messages under 5 words.

## Request-scoped Context (CLS)

Language and other request-scoped values are stored in CLS (`nestjs-cls`), not passed as parameters.

- `ClsModule` is configured globally in `app.module.ts` with middleware that reads `Accept-Language` header
- Store type: `src/common/context/app-cls.store.ts` (`AppClsStore`)
- `msg()` reads `lang` from CLS automatically — no `lang` parameter needed anywhere
- Fallback: defaults to `'en'` when CLS is unavailable (bootstrap, background jobs)
- **Never** add `lang` parameters to controllers or services — CLS handles it
- **Never** use `@Lang()` decorator — it has been removed

## Service method signatures

Standard parameter order:
`methodName(tenantId, ...domainParams, dto?, auditContext?, containerTransaction?)`

Every method in a transaction chain must accept `containerTransaction?: Transaction`.

## No magic numbers

Every business rule number must be a named constant in `src/common/constants/`.
Examples: `MAX_PIN_ATTEMPTS`, `PIN_LOCKOUT_MINUTES`, `VAT_RATE`, `MAX_HELD_ORDERS`.
