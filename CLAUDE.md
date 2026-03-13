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
