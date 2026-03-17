# Tatweer — Schema Validation & Rewrite

> Multi-tenant | Single company per tenant | Multi-branch

---

## PART 1 — VALIDATION REPORT

### 🔴 Critical Issues (break the architecture)

**1. tenantId missing from core tables**
These tables exist at tenant level but have no tenantId — in a multi-tenant system this means all tenants share the same data:

```
branches           → ADD tenantId
chart_of_accounts  → ADD tenantId
journal_entries    → ADD tenantId
journal_lines      → ADD tenantId
fiscal_periods     → ADD tenantId
products           → ADD tenantId
product_categories → ADD tenantId
currencies         → ADD tenantId (each tenant has own base currency)
exchange_rates     → ADD tenantId
```

**2. Saudi-specific fields — wrong market (Egypt)**

```
employees.isSaudi              → REMOVE (Egypt context)
sales_orders ZATCA fields      → REPLACE with ETA (Egyptian Tax Authority) fields
payroll_runs.totalGosiEmployer → RENAME to totalSIEmployer (Egyptian SI, not Saudi GOSI)
```

**3. Sales Orders mixing Invoice data**
Sales orders and invoices are separate documents in Odoo and in our plan.
A sale order can generate one or many invoices. They must be separate tables.

```
sales_orders  → keep as order only (no invoice fields)
invoices      → NEW table (separate lifecycle: draft → posted → paid)
```

**4. Contacts + Vendors split — should be unified Partners**
Currently CRM contacts and purchasing vendors are separate tables. In accounting,
the same entity can be both a customer and a supplier. Must be unified:

```
contacts (CRM)  → MERGE into partners
vendors         → MERGE into partners
partners        → NEW unified table with type field (customer|supplier|both|individual)
```

**5. JSONB used for business data (our rule: never)**

```
payroll_items.deductions (JSONB) → REMOVE — use payslip_lines rows instead
shifts.workingDays (JSONB)       → REPLACE with shift_working_days join table
```

**6. Salary fields on Employee — should be on Contract**

```
employees.basicSalary           → MOVE to employee_contracts
employees.housingAllowance      → MOVE to employee_contracts
employees.transportationAllowance → MOVE to employee_contracts
```

---

### 🟡 Missing Tables (incomplete business logic)

**Accounting:**

```
company_settings      → global defaults per tenant
branch_settings       → branch-level overrides
taxes                 → tax configuration (%, fixed, scope, include_in_price)
tax_groups            → group multiple taxes
payment_terms         → payment schedule configuration
payment_term_lines    → lines defining the schedule (percent/fixed/balance + days)
journals              → journal configuration (SINV, BNK1, CSH1, MISC, PYRL, STCK)
account_groups        → for grouping accounts in reports
invoices              → customer invoices (separate from sale orders)
invoice_lines         → invoice line items
bills                 → vendor bills
bill_lines            → vendor bill line items
payments              → customer and vendor payments
invoice_payments      → reconciliation (links payments to invoice lines)
```

**Inventory:**

```
stock_locations       → hierarchical locations within warehouses (WH/Stock, WH/Shelf-A)
reorder_rules         → min/max qty rules per product per location
branch_products       → which products are assigned to which branch
supplier_products     → vendor price lists per product
```

**Sales:**

```
pricelists            → price rules per customer segment
pricelist_items       → individual rules (product/category + qty + price/discount)
```

**HR & Payroll:**

```
job_positions         → job titles (separate from department)
leave_types           → configurable leave types (Annual, Sick, Emergency, etc.)
leave_allocations     → allocated days per employee per leave type per year
salary_structures     → defines which rules apply (Egyptian Standard, etc.)
salary_rules          → individual computation rules (BASIC, HRA, SI, TAX, NET)
payslip_lines         → computed result per rule per payslip (replaces JSONB deductions)
```

**CRM:**

```
crm_stages            → pipeline stages (configurable, ordered by sequence)
```

**Products:**

```
combo_products        → combo header (links to parent product)
combo_groups          → choice groups within a combo ("Choose a laptop")
combo_group_items     → selectable options per group + extra_price
```

---

### 🟢 Good — Keep As Is

```
BaseEntity + TenantAwareEntity inheritance   ✅
Soft deletes (deletedAt)                     ✅
Optimistic locking (version)                 ✅
createdBy / updatedBy                        ✅
nameEn / nameAr bilingual columns            ✅
POS tables (terminals, sessions, orders)     ✅
Restaurant (sections, tables, kitchen)       ✅
Loyalty + Vouchers + Gift Cards              ✅
Notifications + Outbox Events                ✅
Audit logs + Security events                 ✅
Sequences table                              ✅
Projects + Tasks + Time Entries              ✅
Roles + Permissions                          ✅
Refresh tokens + API keys                    ✅
Impersonation logs                           ✅
Consent records                              ✅
User preferences + appearance                ✅
FCM tokens                                   ✅
Cost centers                                 ✅
Currencies + Exchange rates (after fix)      ✅
```

---

## PART 2 — REWRITTEN SCHEMA

> Legend:
> (G) = Global table — no tenantId (backoffice/system level)
> (T) = Tenant-level — has tenantId
> (B) = Branch-scoped — has tenantId + branchId
>
> - = new table not in original schema
>   ~ = modified from original schema

---

### BASE ENTITIES

```
BaseEntity (abstract — no table):
  id           UUID PK default uuid_generate_v4()
  createdAt    TIMESTAMP default now()
  updatedAt    TIMESTAMP default now()
  deletedAt    TIMESTAMP nullable (soft delete)
  createdBy    UUID nullable → users
  updatedBy    UUID nullable → users
  version      INT default 1 (optimistic locking)

TenantAwareEntity (abstract — no table):
  ...BaseEntity fields
  tenantId     UUID NOT NULL → tenants
```

---

### SYSTEM & TENANT MANAGEMENT

**tenants** (G)

```
id             UUID PK
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
slug           VARCHAR UNIQUE NOT NULL
status         ENUM(trial, active, suspended, cancelled)
trialEndsAt    TIMESTAMP
settings       JSONB          -- UI/display preferences only (NOT business logic)
features       JSONB          -- feature flags per tenant
logoUrl        VARCHAR
primaryColor   VARCHAR
timezone       VARCHAR default 'Africa/Cairo'
defaultLanguage ENUM(ar, en) default 'ar'
...BaseEntity
```

**plans** (G)

```
id             UUID PK
slug           VARCHAR UNIQUE
nameEn         VARCHAR
nameAr         VARCHAR
monthlyPrice   DECIMAL(10,2)
annualPrice    DECIMAL(10,2)
maxUsers       INT
maxBranches    INT
modules        JSONB          -- which modules are included
features       JSONB          -- feature flags included in plan
isActive       BOOLEAN default true
...BaseEntity
```

**subscriptions** (G)

```
id             UUID PK
tenantId       UUID → tenants
planId         UUID → plans
status         ENUM(trialing, active, past_due, cancelled)
billingCycle   ENUM(monthly, annual)
currentPeriodStart TIMESTAMP
currentPeriodEnd   TIMESTAMP
autoRenewal    BOOLEAN default true
cancelledAt    TIMESTAMP
...BaseEntity
```

---

### AUTH & AUTHORIZATION

**users** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants
email          VARCHAR NOT NULL
               UNIQUE(tenantId, email)
passwordHash   VARCHAR
firstName      VARCHAR NOT NULL
lastName       VARCHAR NOT NULL
phone          VARCHAR
avatarUrl      VARCHAR
pinHash        VARCHAR        -- for POS / attendance kiosk
isActive       BOOLEAN default true
extraPermissions  JSONB       -- grant beyond role
revokedPermissions JSONB      -- revoke from role
lastLoginAt    TIMESTAMP
...BaseEntity
```

**admins** (G) — backoffice team only

```
id             UUID PK
email          VARCHAR UNIQUE
passwordHash   VARCHAR
role           ENUM(super_admin, support, finance, ops)
isActive       BOOLEAN default true
...BaseEntity
```

**roles** (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
UNIQUE(tenantId, nameEn)
isSystem       BOOLEAN default false   -- system roles cannot be deleted
description    VARCHAR
...TenantAwareEntity
```

**user_roles** (T)

```
id             UUID PK
userId         UUID → users
roleId         UUID → roles
...TenantAwareEntity
```

**permissions** (G) — system-defined permission catalog

```
id             UUID PK
module         VARCHAR        -- accounting, inventory, sales, hr, etc.
action         VARCHAR        -- read, create, update, delete, post, approve
resource       VARCHAR        -- specific resource within module
conditions     JSONB          -- contextual conditions (own branch only, etc.)
...BaseEntity
```

**role_permissions** (T)

```
id             UUID PK
roleId         UUID → roles
permissionId   UUID → permissions
...TenantAwareEntity
```

**refresh_tokens** (T)

```
id             UUID PK
userId         UUID → users
tokenHash      VARCHAR
family         VARCHAR        -- token rotation family
revoked        BOOLEAN default false
expiresAt      TIMESTAMP
ipAddress      VARCHAR
userAgent      VARCHAR
...TenantAwareEntity
```

**api_keys** (T)

```
id             UUID PK
tenantId       UUID → tenants
name           VARCHAR
keyHash        VARCHAR
scopes         JSONB
expiresAt      TIMESTAMP
lastUsedAt     TIMESTAMP
...TenantAwareEntity
```

---

### ORGANIZATION

**branches** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants   -- WAS MISSING
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
code           VARCHAR NOT NULL          -- CAI, ALX, GZA
UNIQUE(tenantId, code)
isMain         BOOLEAN default false
address        TEXT
phone          VARCHAR
email          VARCHAR
logoUrl        VARCHAR
isActive       BOOLEAN default true
...TenantAwareEntity
```

_NOTE: No modules field on branch — module access controlled via plan + tenant features_

**departments** (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
parentId       UUID nullable → departments (self-ref)
managerId      UUID nullable → employees
...TenantAwareEntity
```

**job_positions** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
departmentId   UUID nullable → departments
...TenantAwareEntity
```

**cost_centers** (T)

```
id             UUID PK
tenantId       UUID → tenants
code           VARCHAR
nameEn         VARCHAR
nameAr         VARCHAR
parentId       UUID nullable → cost_centers
...TenantAwareEntity
```

---

### SETTINGS

**company_settings** (\*) (T)

```
id             UUID PK
tenantId       UUID UNIQUE → tenants    -- one row per tenant
-- Accounting
defaultARAccountId     UUID → chart_of_accounts
defaultAPAccountId     UUID → chart_of_accounts
defaultCOGSAccountId   UUID → chart_of_accounts
defaultInventoryAccountId UUID → chart_of_accounts
taxExigibility         ENUM(invoice_basis, cash_basis) default 'invoice_basis'
fiscalLockDate         DATE nullable
taxLockDate            DATE nullable
angloSaxonAccounting   BOOLEAN default true
-- Inventory
stockCostingMethod     ENUM(standard, avco, fifo) default 'avco'
negativeStockBlock     BOOLEAN default true
autoReorder            BOOLEAN default true
-- Sales
invoicePolicy          ENUM(on_order, on_delivery) default 'on_delivery'
creditLimitBlock       BOOLEAN default false
creditLimitWarning     BOOLEAN default true
-- Purchasing
threeWayMatch          BOOLEAN default false
threeWayMatchTolerance DECIMAL(5,2) default 0
billControl            ENUM(on_order, on_receipt) default 'on_receipt'
-- HR & Payroll
workDaysPerMonth       INT default 22
workHoursPerDay        INT default 8
overtimeRate           DECIMAL(4,2) default 1.5
lateDeductionEnabled   BOOLEAN default false
lateToleranceMinutes   INT default 0
siEmployeePct          DECIMAL(5,2) default 11.00
siEmployerPct          DECIMAL(5,2) default 18.75
incomeTaxMethod        ENUM(bracket, flat) default 'bracket'
eoscEnabled            BOOLEAN default true
eoscBase               ENUM(last_wage, average) default 'last_wage'
negativeLeaveAllowed   BOOLEAN default false
...TenantAwareEntity
```

**branch_settings** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
key            VARCHAR
value          TEXT
UNIQUE(tenantId, branchId, key)
...TenantAwareEntity
```

---

### CURRENCY

**currencies** (~) (T)

```
id             UUID PK
tenantId       UUID → tenants           -- WAS MISSING
code           VARCHAR(3)               -- EGP, USD, EUR
nameEn         VARCHAR
nameAr         VARCHAR
symbol         VARCHAR
isBase         BOOLEAN default false    -- only one base per tenant
decimalPlaces  INT default 2
isActive       BOOLEAN default true
UNIQUE(tenantId, code)
...TenantAwareEntity
```

**exchange_rates** (~) (T)

```
id             UUID PK
tenantId       UUID → tenants           -- WAS MISSING
fromCurrencyId UUID → currencies
toCurrencyId   UUID → currencies
rate           DECIMAL(18,6)
rateDate       DATE
...TenantAwareEntity
```

---

### ACCOUNTING

**account_groups** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
codePrefix     VARCHAR                  -- e.g. "11" groups all 11xx accounts
nameEn         VARCHAR
nameAr         VARCHAR
parentId       UUID nullable → account_groups
...TenantAwareEntity
```

**chart_of_accounts** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants  -- WAS MISSING
code           VARCHAR NOT NULL
UNIQUE(tenantId, code)
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
type           ENUM(asset, liability, equity, revenue, expense)
normalBalance  ENUM(debit, credit)      -- computed from type but stored for performance
parentId       UUID nullable → chart_of_accounts
groupId        UUID nullable → account_groups
currencyId     UUID nullable → currencies  -- force currency (optional)
isReconcilable BOOLEAN default false    -- required for AR/AP accounts
isDeprecated   BOOLEAN default false
openingBalance DECIMAL(18,2) default 0
...TenantAwareEntity
```

**fiscal_periods** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants  -- WAS MISSING
fiscalYear     INT
fiscalMonth    INT
startDate      DATE
endDate        DATE
status         ENUM(open, closed, locked)
UNIQUE(tenantId, fiscalYear, fiscalMonth)
...TenantAwareEntity
```

**journals** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
type           ENUM(sale, purchase, cash, bank, general)
code           VARCHAR                  -- SINV, BNK1, CSH1, MISC, PYRL, STCK
UNIQUE(tenantId, code)
defaultAccountId UUID nullable → chart_of_accounts
suspenseAccountId UUID nullable → chart_of_accounts  -- bank journals
currencyId     UUID nullable → currencies
sequencePrefix VARCHAR
isActive       BOOLEAN default true
...TenantAwareEntity
```

**journal_entries** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
journalId      UUID → journals
entryNumber    VARCHAR                  -- MISC/CAI/2024/0001
periodId       UUID → fiscal_periods
entryDate      DATE
entryType      ENUM(invoice, payment, stock, payroll, manual, reversal)
reference      VARCHAR
memo           TEXT
isPosted       BOOLEAN default false
isReversed     BOOLEAN default false
reversalOfId   UUID nullable → journal_entries
...TenantAwareEntity
```

**journal_lines** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
journalEntryId UUID → journal_entries
accountId      UUID → chart_of_accounts
partnerId      UUID nullable → partners  -- required for AR/AP accounts
costCenterId   UUID nullable → cost_centers
description    VARCHAR
debit          DECIMAL(18,2) default 0
credit         DECIMAL(18,2) default 0
currencyId     UUID nullable → currencies
amountCurrency DECIMAL(18,2) nullable   -- amount in foreign currency
exchangeRate   DECIMAL(18,6) default 1
isReconciled   BOOLEAN default false
...TenantAwareEntity
```

**taxes** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
type           ENUM(percentage, fixed)
amount         DECIMAL(8,4)             -- e.g. 14.0000 for 14%
scope          ENUM(sale, purchase, both)
includeInPrice BOOLEAN default false
taxGroupId     UUID nullable → tax_groups
saleAccountId  UUID nullable → chart_of_accounts
purchaseAccountId UUID nullable → chart_of_accounts
isActive       BOOLEAN default true
...TenantAwareEntity
```

**tax_groups** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
...TenantAwareEntity
```

**payment_terms** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
note           VARCHAR
...TenantAwareEntity
```

**payment_term_lines** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
paymentTermId  UUID → payment_terms
sequence       INT
type           ENUM(percent, fixed, balance)
value          DECIMAL(8,2)
days           INT default 0
dayOfMonth     INT nullable
...TenantAwareEntity
```

---

### PARTNERS (unified customers + suppliers + individuals)

**partners** (\*) (T) [replaces: contacts (CRM) + vendors]

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
type           ENUM(customer, supplier, both, individual)
isCustomer     BOOLEAN default false
isSupplier     BOOLEAN default false
taxNumber      VARCHAR
vatNumber      VARCHAR
phone          VARCHAR
mobile         VARCHAR
email          VARCHAR
website        VARCHAR
street         VARCHAR
city           VARCHAR
state          VARCHAR
country        VARCHAR default 'Egypt'
zip            VARCHAR
creditLimit    DECIMAL(18,2) default 0
paymentTermId  UUID nullable → payment_terms
pricelistId    UUID nullable → pricelists
arAccountId    UUID nullable → chart_of_accounts   -- override default AR
apAccountId    UUID nullable → chart_of_accounts   -- override default AP
bankIban       VARCHAR
bankName       VARCHAR
notes          TEXT
isActive       BOOLEAN default true
...TenantAwareEntity
```

**partner_contacts** (T) [child contacts of a partner company]

```
id             UUID PK
tenantId       UUID → tenants
partnerId      UUID → partners
firstName      VARCHAR
lastName       VARCHAR
phone          VARCHAR
mobile         VARCHAR
email          VARCHAR
position       VARCHAR
isMain         BOOLEAN default false
...TenantAwareEntity
```

---

### INVOICES & PAYMENTS

**invoices** (\*) (B) [replaces invoice fields on sales_orders]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
journalId      UUID → journals
partnerId      UUID NOT NULL → partners
invoiceType    ENUM(out_invoice, out_refund, in_invoice, in_refund)
               -- out_invoice = customer invoice
               -- out_refund  = customer credit note
               -- in_invoice  = vendor bill
               -- in_refund   = vendor refund
status         ENUM(draft, posted, cancelled)
paymentStatus  ENUM(not_paid, partial, paid, reversed)
invoiceNumber  VARCHAR                  -- INV/CAI/2024/0001
invoiceDate    DATE
dueDate        DATE
paymentTermId  UUID nullable → payment_terms
saleOrderId    UUID nullable → sales_orders
purchaseOrderId UUID nullable → purchase_orders
journalEntryId UUID nullable → journal_entries  -- created on post
currencyId     UUID → currencies
amountUntaxed  DECIMAL(18,2)
amountTax      DECIMAL(18,2)
amountTotal    DECIMAL(18,2)
amountResidual DECIMAL(18,2)            -- remaining unpaid
reference      VARCHAR                  -- customer's PO number
narration      TEXT
-- ETA (Egyptian Tax Authority) e-invoicing fields
etaUUID        VARCHAR nullable
etaSubmissionId VARCHAR nullable
etaStatus      ENUM(not_submitted, submitted, accepted, rejected) nullable
etaQRCode      TEXT nullable
etaSignature   TEXT nullable
...TenantAwareEntity
```

**invoice_lines** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
invoiceId      UUID → invoices
productId      UUID nullable → products
description    VARCHAR
quantity       DECIMAL(18,4)
unitPrice      DECIMAL(18,4)
discountPct    DECIMAL(5,2) default 0
priceSubtotal  DECIMAL(18,2)            -- qty * unitPrice - discount
priceTax       DECIMAL(18,2)
priceTotal     DECIMAL(18,2)
accountId      UUID → chart_of_accounts
sequence       INT
...TenantAwareEntity
```

**invoice_line_taxes** (\*) (T) [many-to-many invoice_lines ↔ taxes]

```
id             UUID PK
tenantId       UUID → tenants
invoiceLineId  UUID → invoice_lines
taxId          UUID → taxes
```

**payments** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
journalId      UUID → journals
partnerId      UUID → partners
paymentType    ENUM(inbound, outbound)  -- inbound = receive, outbound = send
status         ENUM(draft, posted, cancelled)
paymentNumber  VARCHAR                  -- PAY/CAI/2024/0001
paymentDate    DATE
amount         DECIMAL(18,2)
currencyId     UUID → currencies
memo           VARCHAR
journalEntryId UUID nullable → journal_entries
...TenantAwareEntity
```

**invoice_payments** (\*) (B) [reconciliation]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
invoiceId      UUID → invoices
paymentId      UUID → payments
amount         DECIMAL(18,2)            -- amount allocated
...TenantAwareEntity
```

---

### PRODUCTS & INVENTORY

**product_categories** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants  -- WAS MISSING
nameEn         VARCHAR
nameAr         VARCHAR
parentId       UUID nullable → product_categories
incomeAccountId     UUID nullable → chart_of_accounts
cogsAccountId       UUID nullable → chart_of_accounts
inventoryAccountId  UUID nullable → chart_of_accounts
...TenantAwareEntity
```

**products** (~) (T)

```
id             UUID PK
tenantId       UUID NOT NULL → tenants  -- WAS MISSING
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
internalRef    VARCHAR
barcode        VARCHAR
categoryId     UUID nullable → product_categories
brandId        UUID nullable → product_brands
unitOfMeasureId UUID → unit_of_measures
purchaseUomId  UUID nullable → unit_of_measures
productType    ENUM(goods, service, combo)   -- combo is new
canBeSold      BOOLEAN default true
canBePurchased BOOLEAN default true
salePrice      DECIMAL(18,4)
costPrice      DECIMAL(18,4)
-- Stock tracking (goods only)
hasVariants          BOOLEAN default false
hasSerialTracking    BOOLEAN default false
hasLotTracking       BOOLEAN default false
hasExpiryDate        BOOLEAN default false
-- Accounts (override category)
incomeAccountId      UUID nullable → chart_of_accounts
cogsAccountId        UUID nullable → chart_of_accounts
inventoryAccountId   UUID nullable → chart_of_accounts
stockInputAccountId  UUID nullable → chart_of_accounts
stockOutputAccountId UUID nullable → chart_of_accounts
isActive             BOOLEAN default true
...TenantAwareEntity
```

**product_taxes** (T) [many-to-many products ↔ taxes]

```
id             UUID PK
tenantId       UUID → tenants
productId      UUID → products
taxId          UUID → taxes
scope          ENUM(sale, purchase)
```

**product_brands** (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
...TenantAwareEntity
```

**unit_of_measures** (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
code           VARCHAR
category       VARCHAR                  -- Length, Weight, Volume, Units
type           ENUM(reference, bigger, smaller)
ratio          DECIMAL(18,6) default 1
...TenantAwareEntity
```

**combo_products** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
productId      UUID UNIQUE → products   -- the parent combo product
...TenantAwareEntity
```

**combo_groups** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
comboId        UUID → combo_products
nameEn         VARCHAR                  -- "Choose a Laptop"
nameAr         VARCHAR
sequence       INT
isRequired     BOOLEAN default true
...TenantAwareEntity
```

**combo_group_items** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
groupId        UUID → combo_groups
productId      UUID → products          -- the selectable option
extraPrice     DECIMAL(18,4) default 0  -- 0 = included, >0 = upgrade
sequence       INT
...TenantAwareEntity
```

**branch_products** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
productId      UUID → products
UNIQUE(tenantId, branchId, productId)
...TenantAwareEntity
```

**supplier_products** (T) [vendor price list per product]

```
id             UUID PK
tenantId       UUID → tenants
productId      UUID → products
partnerId      UUID → partners          -- must be supplier
minQty         DECIMAL(18,4) default 1
price          DECIMAL(18,4)
currencyId     UUID → currencies
leadTimeDays   INT default 0
sequence       INT default 1            -- preferred vendor = sequence 1
...TenantAwareEntity
```

**pricelists** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
currencyId     UUID → currencies
discountPolicy ENUM(include_in_price, discount_on_sale) default 'discount_on_sale'
startDate      DATE nullable
endDate        DATE nullable
isActive       BOOLEAN default true
...TenantAwareEntity
```

**pricelist_items** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
pricelistId    UUID → pricelists
applyOn        ENUM(all, category, product)
productId      UUID nullable → products
categoryId     UUID nullable → product_categories
minQty         DECIMAL(18,4) default 0
computation    ENUM(fixed, percentage, formula)
price          DECIMAL(18,4) nullable
discountPct    DECIMAL(5,2) nullable
startDate      DATE nullable
endDate        DATE nullable
sequence       INT
...TenantAwareEntity
```

---

### WAREHOUSES & LOCATIONS

**warehouses** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
nameEn         VARCHAR
nameAr         VARCHAR
shortName      VARCHAR                  -- WH
address        TEXT
allowNegativeStock BOOLEAN default false
...TenantAwareEntity
```

**stock_locations** (\*) (T) [hierarchical locations within warehouses]

```
id             UUID PK
tenantId       UUID → tenants
warehouseId    UUID nullable → warehouses  -- null for virtual locations
nameEn         VARCHAR
nameAr         VARCHAR
fullName       VARCHAR                  -- WH/Stock/Shelf-A (computed)
parentId       UUID nullable → stock_locations
locationType   ENUM(internal, customer, supplier, transit, virtual, scrap)
isScrap        BOOLEAN default false
isReturn       BOOLEAN default false
isActive       BOOLEAN default true
...TenantAwareEntity
```

**stock_quants** (~) (B) [was: stock_levels]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
productId      UUID → products
locationId     UUID → stock_locations
lotNumber      VARCHAR nullable
serialNumber   VARCHAR nullable
expiryDate     DATE nullable
qtyOnHand      DECIMAL(18,4) default 0
qtyReserved    DECIMAL(18,4) default 0
avgCost        DECIMAL(18,6) default 0
UNIQUE(tenantId, productId, locationId, lotNumber, serialNumber)
...TenantAwareEntity
```

**stock_moves** (~) (B) [was: stock_movements]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
productId      UUID → products
fromLocationId UUID → stock_locations
toLocationId   UUID → stock_locations
moveType       ENUM(receipt, delivery, transfer, adjustment, scrap, return)
status         ENUM(draft, confirmed, done, cancelled)
qtyDemand      DECIMAL(18,4)
qtyDone        DECIMAL(18,4) default 0
unitCost       DECIMAL(18,6)
lotNumber      VARCHAR nullable
serialNumber   VARCHAR nullable
expiryDate     DATE nullable
reference      VARCHAR                  -- origin document ref
originModel    VARCHAR                  -- sale_order, purchase_order, etc.
originId       UUID
scheduledDate  DATE
doneDate       TIMESTAMP nullable
journalEntryId UUID nullable → journal_entries
...TenantAwareEntity
```

**reorder_rules** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
productId      UUID → products
locationId     UUID → stock_locations
partnerId      UUID nullable → partners  -- preferred vendor
minQty         DECIMAL(18,4)
maxQty         DECIMAL(18,4)
leadTimeDays   INT default 0
isActive       BOOLEAN default true
...TenantAwareEntity
```

---

### SALES

**sales_orders** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
orderNumber    VARCHAR                  -- SO/CAI/2024/0001
UNIQUE(tenantId, orderNumber)
partnerId      UUID → partners
pricelistId    UUID nullable → pricelists
paymentTermId  UUID nullable → payment_terms
salespersonId  UUID nullable → users
status         ENUM(draft, confirmed, done, cancelled)
invoiceStatus  ENUM(nothing, to_invoice, invoiced)
deliveryStatus ENUM(pending, partial, done)
orderDate      DATE
expiryDate     DATE nullable
deliveryAddress TEXT
incoterms      VARCHAR
reference      VARCHAR                  -- customer's PO number
notes          TEXT
internalNotes  TEXT
currencyId     UUID → currencies
amountUntaxed  DECIMAL(18,2)
amountTax      DECIMAL(18,2)
amountTotal    DECIMAL(18,2)
-- REMOVED: all ZATCA/invoice fields (moved to invoices table)
...TenantAwareEntity
```

**sales_order_lines** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
orderId        UUID → sales_orders
productId      UUID → products
description    VARCHAR
quantity       DECIMAL(18,4)
unitPrice      DECIMAL(18,4)
discountPct    DECIMAL(5,2) default 0
priceSubtotal  DECIMAL(18,2)
priceTax       DECIMAL(18,2)
priceTotal     DECIMAL(18,2)
qtyDelivered   DECIMAL(18,4) default 0
qtyInvoiced    DECIMAL(18,4) default 0
sequence       INT
-- Combo expansion
isComboParent  BOOLEAN default false
comboParentLineId UUID nullable → sales_order_lines
...TenantAwareEntity
```

**deliveries** (\*) (B) [outgoing shipments]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
reference      VARCHAR                  -- OUT/CAI/2024/0001
saleOrderId    UUID nullable → sales_orders
partnerId      UUID → partners
status         ENUM(draft, ready, done, cancelled)
scheduledDate  DATE
doneDate       TIMESTAMP nullable
responsibleId  UUID nullable → users
notes          TEXT
...TenantAwareEntity
```

**delivery_lines** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
deliveryId     UUID → deliveries
productId      UUID → products
saleOrderLineId UUID nullable → sales_order_lines
stockMoveId    UUID nullable → stock_moves
qtyDemand      DECIMAL(18,4)
qtyDone        DECIMAL(18,4) default 0
unitOfMeasureId UUID → unit_of_measures
locationId     UUID → stock_locations
lotNumber      VARCHAR nullable
serialNumber   VARCHAR nullable
...TenantAwareEntity
```

---

### PURCHASING

**purchase_orders** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
orderNumber    VARCHAR                  -- PO/CAI/2024/0001
UNIQUE(tenantId, orderNumber)
partnerId      UUID → partners          -- must be supplier
buyerId        UUID nullable → users
paymentTermId  UUID nullable → payment_terms
status         ENUM(draft, confirmed, done, cancelled)
billStatus     ENUM(nothing, to_bill, billed)
receiptStatus  ENUM(nothing, partial, received)
orderDate      DATE
scheduledDate  DATE nullable
currencyId     UUID → currencies
amountUntaxed  DECIMAL(18,2)
amountTax      DECIMAL(18,2)
amountTotal    DECIMAL(18,2)
notes          TEXT
...TenantAwareEntity
```

**purchase_order_lines** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
orderId        UUID → purchase_orders
productId      UUID → products
description    VARCHAR
quantity       DECIMAL(18,4)
unitPrice      DECIMAL(18,4)
priceSubtotal  DECIMAL(18,2)
priceTax       DECIMAL(18,2)
priceTotal     DECIMAL(18,2)
qtyReceived    DECIMAL(18,4) default 0
qtyBilled      DECIMAL(18,4) default 0
sequence       INT
...TenantAwareEntity
```

**receipts** (\*) (B) [incoming shipments]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
reference      VARCHAR                  -- IN/CAI/2024/0001
purchaseOrderId UUID nullable → purchase_orders
partnerId      UUID → partners
status         ENUM(draft, ready, done, cancelled)
scheduledDate  DATE
doneDate       TIMESTAMP nullable
responsibleId  UUID nullable → users
notes          TEXT
...TenantAwareEntity
```

**receipt_lines** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
receiptId      UUID → receipts
productId      UUID → products
purchaseOrderLineId UUID nullable → purchase_order_lines
stockMoveId    UUID nullable → stock_moves
qtyDemand      DECIMAL(18,4)
qtyDone        DECIMAL(18,4) default 0
unitOfMeasureId UUID → unit_of_measures
locationId     UUID → stock_locations
lotNumber      VARCHAR nullable
serialNumber   VARCHAR nullable
expiryDate     DATE nullable
unitCost       DECIMAL(18,6)
...TenantAwareEntity
```

---

### HR & PAYROLL

**employees** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
userId         UUID nullable UNIQUE → users   -- linked system user (optional)
departmentId   UUID nullable → departments
jobPositionId  UUID nullable → job_positions
managerId      UUID nullable → employees
employeeCode   VARCHAR
nameEn         VARCHAR NOT NULL
nameAr         VARCHAR NOT NULL
nationalId     VARCHAR
birthDate      DATE
gender         ENUM(male, female)
maritalStatus  ENUM(single, married, divorced, widowed)
nationality    VARCHAR default 'Egyptian'
phone          VARCHAR
mobile         VARCHAR
workEmail      VARCHAR
homeAddress    TEXT
emergencyContact VARCHAR
emergencyPhone   VARCHAR
bankAccount    VARCHAR
bankName       VARCHAR
pinCode        VARCHAR                  -- for kiosk
avatarUrl      VARCHAR
hireDate       DATE
isActive       BOOLEAN default true
-- REMOVED: basicSalary, housingAllowance, transportationAllowance (moved to contracts)
-- REMOVED: isSaudi (Egypt context)
...TenantAwareEntity
```

**employee_contracts** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
employeeId     UUID → employees
reference      VARCHAR
salaryStructureId UUID → salary_structures
status         ENUM(draft, active, expired, cancelled)
startDate      DATE
endDate        DATE nullable            -- null = open-ended
wageType       ENUM(monthly, daily, hourly)
wage           DECIMAL(18,2)           -- moved from employees
basicSalary    DECIMAL(18,2)           -- moved from employees
housingAllowance DECIMAL(18,2) default 0  -- moved from employees
transportationAllowance DECIMAL(18,2) default 0  -- moved from employees
workingScheduleId UUID nullable → shifts
notes          TEXT
...TenantAwareEntity
```

**salary_structures** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
type           ENUM(employee, worker, hourly)
parentId       UUID nullable → salary_structures
...TenantAwareEntity
```

**salary_rules** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
structureId    UUID → salary_structures
sequence       INT                      -- computation order (NET must be last)
code           VARCHAR                  -- BASIC, HRA, TRANS, SI_EMP, TAX, NET
nameEn         VARCHAR
nameAr         VARCHAR
category       ENUM(basic, allowance, deduction, gross, net, other)
conditionType  ENUM(always, python)
conditionPython TEXT nullable
computationType ENUM(fixed, percentage, code)
amount         DECIMAL(18,4) nullable   -- for fixed
percentBase    VARCHAR nullable         -- e.g. "GROSS" (code of base rule)
percentValue   DECIMAL(8,4) nullable
codePython     TEXT nullable            -- for complex rules
appearsOnPayslip BOOLEAN default true
...TenantAwareEntity
```

**shifts** (~) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
startTime      TIME
endTime        TIME
breakMinutes   INT default 0
isOvernight    BOOLEAN default false
-- REMOVED: workingDays JSONB
...TenantAwareEntity
```

**shift_working_days** (\*) (T) [replaces workingDays JSONB]

```
id             UUID PK
tenantId       UUID → tenants
shiftId        UUID → shifts
dayOfWeek      INT                      -- 0=Sunday, 1=Monday, ..., 6=Saturday
```

**leave_types** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
color          VARCHAR
requiresApproval BOOLEAN default true
allowNegative  BOOLEAN default false
isActive       BOOLEAN default true
...TenantAwareEntity
```

**leave_allocations** (\*) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
employeeId     UUID → employees
leaveTypeId    UUID → leave_types
year           INT
numberOfDays   DECIMAL(8,2)
mode           ENUM(manual, accrual)
status         ENUM(draft, confirmed, approved, refused)
approvedById   UUID nullable → users
approvedAt     TIMESTAMP nullable
...TenantAwareEntity
```

**leave_requests** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
employeeId     UUID → employees
leaveTypeId    UUID → leave_types       -- was: leaveType ENUM → now FK
startDate      DATE
endDate        DATE
isHalfDay      BOOLEAN default false
halfDayPeriod  ENUM(morning, afternoon) nullable
numberOfDays   DECIMAL(8,2)
status         ENUM(draft, confirmed, approved, refused)
approvedById   UUID nullable → users
approvedAt     TIMESTAMP nullable
reason         TEXT
refusalReason  TEXT nullable
...TenantAwareEntity
```

**attendance_records** (~) (B) [renamed to: attendance]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
employeeId     UUID → employees
date           DATE
clockIn        TIMESTAMP
clockOut       TIMESTAMP nullable
workedHours    DECIMAL(6,2)            -- computed: clockOut - clockIn
overtimeMinutes INT default 0
lateMinutes    INT default 0
status         ENUM(present, absent, on_leave, holiday)
note           TEXT nullable
...TenantAwareEntity
```

**payslips** (~) (B) [was: payroll_runs renamed + restructured]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
employeeId     UUID → employees
contractId     UUID → employee_contracts
structureId    UUID → salary_structures
reference      VARCHAR                  -- SLIP/CAI/2024/0001
periodStart    DATE
periodEnd      DATE
status         ENUM(draft, confirmed, cancelled)
-- Totals (computed from lines)
grossSalary    DECIMAL(18,2)
totalDeductions DECIMAL(18,2)
netSalary      DECIMAL(18,2)
siEmployee     DECIMAL(18,2)
siEmployer     DECIMAL(18,2)           -- employer share (not deducted, for reporting)
incomeTax      DECIMAL(18,2)
-- Journal
journalEntryId UUID nullable → journal_entries
...TenantAwareEntity
```

**payslip_lines** (\*) (B) [replaces JSONB deductions on payroll_items]

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
payslipId      UUID → payslips
ruleId         UUID → salary_rules
code           VARCHAR                  -- BASIC, HRA, SI_EMP, TAX, NET
nameEn         VARCHAR
nameAr         VARCHAR
category       ENUM(basic, allowance, deduction, gross, net, other)
sequence       INT
quantity       DECIMAL(18,4) default 1
rate           DECIMAL(18,6) default 1
amount         DECIMAL(18,2)
appearsOnPayslip BOOLEAN default true
...TenantAwareEntity
```

**NOTE: payroll_runs table is removed.**
Individual payslips replace it. Batch generation is a service operation
that creates multiple payslip records, not a separate table.

---

### CRM

**crm_stages** (\*) (T)

```
id             UUID PK
tenantId       UUID → tenants
nameEn         VARCHAR
nameAr         VARCHAR
sequence       INT
probability    DECIMAL(5,2) default 20
isWon          BOOLEAN default false   -- winning stage triggers SO creation
isFolded       BOOLEAN default false   -- collapsed in kanban
...TenantAwareEntity
```

**leads** (~) (T)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
title          VARCHAR NOT NULL
type           ENUM(lead, opportunity)
partnerId      UUID nullable → partners
stageId        UUID → crm_stages
assignedTo     UUID nullable → users
teamId         UUID nullable
priority       SMALLINT default 0      -- 0-3 stars
probability    DECIMAL(5,2)
expectedRevenue DECIMAL(18,2)
expectedCloseDate DATE nullable
source         VARCHAR
campaign       VARCHAR
medium         VARCHAR
isWon          BOOLEAN default false
isLost         BOOLEAN default false
lostReason     TEXT nullable
tags           TEXT[]
notes          TEXT
saleOrderId    UUID nullable → sales_orders  -- created on win
...TenantAwareEntity
```

**lead_activities** (~) (T)

```
id             UUID PK
tenantId       UUID → tenants
leadId         UUID → leads
type           ENUM(call, email, meeting, note, task, deadline)
title          VARCHAR
summary        TEXT
scheduledFor   TIMESTAMP
isDone         BOOLEAN default false
doneAt         TIMESTAMP nullable
assignedTo     UUID nullable → users
...TenantAwareEntity
```

---

### POS & RESTAURANT (kept as-is, minor tenantId additions)

**pos_terminals** (B)

```
+ tenantId  UUID → tenants (if missing)
All other fields kept as-is
```

**pos_sessions** (B) — kept as-is
**pos_orders** (B) — kept as-is
**pos_order_items** (B) — kept as-is
**pos_payments** (B) — kept as-is
**pos_refunds** (B) — kept as-is
**pos_held_orders** (B) — kept as-is
**kitchen_tickets** (B) — kept as-is
**restaurant_sections** (B) — kept as-is
**restaurant_tables** (B) — kept as-is

---

### LOYALTY & VOUCHERS (kept as-is)

**loyalty_programs** (T) — kept as-is
**loyalty_tiers** (T) — kept as-is
**loyalty_accounts** (T) — kept as-is
**loyalty_transactions** (T) — kept as-is
**vouchers** (T) — kept as-is
**gift_cards** (T) — kept as-is
**gift_card_transactions** (T) — kept as-is

---

### PROJECTS (kept as-is)

**projects** (T) — kept as-is
**tasks** (T) — kept as-is
**task_time_entries** (T) — kept as-is
**project_members** (T) — kept as-is

---

### NOTIFICATIONS & EVENTS (kept as-is)

**notifications** (T) — kept as-is
**notification_templates** (G) — kept as-is
**outbox_events** (T) — kept as-is

---

### SECURITY & AUDIT (kept as-is)

**audit_logs** (G) — kept as-is
**security_events** (G) — kept as-is
**impersonation_logs** (G) — kept as-is
**consent_records** (T) — kept as-is

---

### MISC & CONFIG

**sequences** (~) (B)

```
id             UUID PK
tenantId       UUID → tenants
branchId       UUID → branches
entity         VARCHAR                  -- sale_order, invoice, payment, etc.
UNIQUE(tenantId, branchId, entity)
prefix         VARCHAR                  -- SO, INV, PAY
branchCode     VARCHAR                  -- CAI, ALX
lastValue      INT default 0
padding        INT default 4
resetCycle     ENUM(never, yearly, monthly)
...TenantAwareEntity
```

**tenant_onboarding** (~) (T)

```
tenantSlug     VARCHAR UNIQUE
+ tenantId     UUID → tenants
All step booleans kept as-is
```

---

## PART 3 — SUMMARY OF CHANGES

### Tables Added (24 new)

```
company_settings       branch_settings        account_groups
journals               taxes                  tax_groups
payment_terms          payment_term_lines      partners
partner_contacts       invoices               invoice_lines
invoice_line_taxes     invoice_payments       payments
stock_locations        reorder_rules          branch_products
supplier_products      pricelists             pricelist_items
deliveries             delivery_lines         receipts
receipt_lines          salary_structures      salary_rules
payslip_lines          leave_types            leave_allocations
crm_stages             job_positions          combo_products
combo_groups           combo_group_items      shift_working_days
product_taxes
```

### Tables Removed (3)

```
payroll_runs  → replaced by payslips (restructured)
contacts      → merged into partners
vendors       → merged into partners
```

### Tables Renamed (4)

```
stock_levels      → stock_quants
stock_movements   → stock_moves
attendance_records → attendance
payroll_items     → payslip_lines (restructured)
```

### Tables Modified (15)

```
tenants, users, branches, chart_of_accounts, fiscal_periods,
products, product_categories, warehouses, sales_orders,
sales_order_lines, purchase_orders, purchase_order_lines,
employees, employee_contracts, leave_requests,
leads, shifts, sequences
```

### Key Architecture Fixes

```
✅ tenantId added to all missing tables
✅ ZATCA → ETA (Egypt not Saudi)
✅ GOSI → SI (Egyptian Social Insurance)
✅ isSaudi → removed
✅ Salary fields moved from employees → contracts
✅ JSONB deductions → payslip_lines rows
✅ JSONB workingDays → shift_working_days table
✅ Sales orders and invoices separated
✅ Contacts + vendors → unified partners table
✅ leave_requests.leaveType enum → leaveTypeId FK
✅ Combo product type added
✅ branch_products join table added
```

---

## PART 4 — IMPLEMENTATION PROMPT

Use this prompt when starting the implementation session:

```
I'm building Tatweer, a multi-tenant SaaS ERP (one company per tenant, multi-branch).
The full validated schema is in tatweer-schema.md (attached).

Today's task: Implement [MODULE NAME] — [specific tables]

Rules:
- NestJS + TypeScript + TypeORM (PostgreSQL)
- All entities extend TenantAwareEntity (has tenantId)
- Branch-scoped entities also have branchId
- tenantId injected from JWT middleware only — never from request body
- branchId injected from JWT middleware only — never from request body
- version field on all entities (optimistic locking)
- Soft deletes (deletedAt — TypeORM @DeleteDateColumn)
- Bilingual: nameEn + nameAr on all name fields (no JSONB, no single name field)
- Sequence format: {PREFIX}/{BRANCH_CODE}/{YEAR}/{0001}
- Response shape: { data, meta } — paginated: { data[], meta: { page, limit, total } }

Start with:
1. TypeORM entities (with all columns, relations, indexes)
2. DTOs (CreateDto, UpdateDto, FilterDto — all with zod or class-validator)
3. Service (business logic — follow the rules in tatweer-plan.md)
4. Controller (REST endpoints as defined in tatweer-plan.md)
```

---

## PART 5 — ODOO FEATURE ADDITIONS

### Cross-Module Features (affect every module)

---

#### Chatter & Log Notes

Every major record (invoices, orders, partners, employees, leads, payslips, etc.)
has a chatter — stored in MongoDB (already in tech stack for logs).

**messages** (MongoDB collection — per tenant)

```
{
  _id:          ObjectId
  tenantId:     UUID
  model:        String     -- "invoice", "sale_order", "partner", etc.
  recordId:     UUID       -- the record this message belongs to
  type:         Enum       -- message | log_note | activity_done
  authorId:     UUID       -- users.id
  authorName:   String     -- snapshot
  body:         String     -- HTML content
  attachments:  Array<{ name, url, size, mimeType }>
  subtype:      String     -- discussed | note
  createdAt:    Date
}
```

**followers** (MongoDB collection)

```
{
  _id:          ObjectId
  tenantId:     UUID
  model:        String
  recordId:     UUID
  userId:       UUID
  subtypes:     Array<String>   -- which events to notify on
}
```

---

#### Activities

Scheduled actions on any record. Already partially in leads — now universal.

**activities** (\*) (T) — PostgreSQL (needs querying + filtering)

```
id              UUID PK
tenantId        UUID → tenants
model           VARCHAR          -- "sale_order", "invoice", "partner", etc.
recordId        UUID             -- the record
recordName      VARCHAR          -- snapshot of record name for display
activityType    ENUM(call, email, meeting, todo, deadline, upload_document)
summary         VARCHAR
note            TEXT
scheduledDate   DATE
assignedTo      UUID → users
isDone          BOOLEAN default false
doneAt          TIMESTAMP nullable
doneByUserId    UUID nullable → users
feedbackNote    TEXT nullable
...TenantAwareEntity
```

---

#### Fiscal Positions

**fiscal_positions** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
nameEn          VARCHAR
nameAr          VARCHAR
autoDetect      BOOLEAN default false
country         VARCHAR nullable
note            TEXT
...TenantAwareEntity
```

**fiscal_position_taxes** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
fiscalPositionId UUID → fiscal_positions
taxSrcId        UUID → taxes            -- map FROM this tax
taxDestId       UUID nullable → taxes   -- TO this tax (null = remove tax)
```

**fiscal_position_accounts** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
fiscalPositionId UUID → fiscal_positions
accountSrcId    UUID → chart_of_accounts
accountDestId   UUID → chart_of_accounts
```

Add to partners:

```
fiscalPositionId UUID nullable → fiscal_positions
```

Add to invoices + sales_orders + purchase_orders:

```
fiscalPositionId UUID nullable → fiscal_positions
```

---

#### Bank Statements + Reconciliation

**bank_statements** (\*) (B)

```
id              UUID PK
tenantId        UUID → tenants
branchId        UUID → branches
journalId       UUID → journals          -- must be bank type
name            VARCHAR                  -- e.g. "BNK1 2024/01"
dateFrom        DATE
dateTo          DATE
balanceStart    DECIMAL(18,2)
balanceEnd      DECIMAL(18,2)
balanceEndReal  DECIMAL(18,2) nullable   -- after reconciliation
status          ENUM(open, posted)
...TenantAwareEntity
```

**bank_statement_lines** (\*) (B)

```
id              UUID PK
tenantId        UUID → tenants
branchId        UUID → branches
statementId     UUID → bank_statements
date            DATE
reference       VARCHAR
partnerName     VARCHAR nullable
amount          DECIMAL(18,2)            -- positive = deposit, negative = withdrawal
isReconciled    BOOLEAN default false
journalEntryId  UUID nullable → journal_entries
paymentId       UUID nullable → payments
...TenantAwareEntity
```

---

#### Product Variants

**product_attributes** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
nameEn          VARCHAR                  -- Color, Size, Material
nameAr          VARCHAR
displayType     ENUM(radio, select, color, pills)
sequence        INT
...TenantAwareEntity
```

**product_attribute_values** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
attributeId     UUID → product_attributes
nameEn          VARCHAR                  -- Red, Blue, Small, Large
nameAr          VARCHAR
htmlColor       VARCHAR nullable          -- for color type
sequence        INT
...TenantAwareEntity
```

**product_template_attributes** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
productId       UUID → products          -- the template product
attributeId     UUID → product_attributes
sequence        INT
```

**product_template_attribute_values** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
templateAttributeId UUID → product_template_attributes
attributeValueId UUID → product_attribute_values
priceExtra      DECIMAL(18,4) default 0
isActive        BOOLEAN default true
```

**product_variants** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
productId       UUID → products          -- the template (parent)
combinationName VARCHAR                  -- "Red / Large" (computed)
barcode         VARCHAR nullable
internalRef     VARCHAR nullable
priceExtra      DECIMAL(18,4) default 0
costPrice       DECIMAL(18,4) nullable   -- override template
isActive        BOOLEAN default true
...TenantAwareEntity
```

**product_variant_attribute_values** (\*) (T)

```
id              UUID PK
tenantId        UUID → tenants
variantId       UUID → product_variants
attributeValueId UUID → product_attribute_values
```

Update sales_order_lines, invoice_lines, purchase_order_lines, stock_moves, stock_quants:

```
Add: productVariantId UUID nullable → product_variants
```

---

#### Down Payments

**down_payments** (\*) (B)

```
id              UUID PK
tenantId        UUID → tenants
branchId        UUID → branches
saleOrderId     UUID → sales_orders
invoiceId       UUID → invoices          -- the down payment invoice
type            ENUM(percentage, fixed)
value           DECIMAL(18,4)            -- % or fixed amount
amount          DECIMAL(18,2)            -- computed amount
isDeducted      BOOLEAN default false    -- deducted from final invoice
...TenantAwareEntity
```

---

#### Email Templates (already referenced, now formalized)

**email_templates** (T)

```
id              UUID PK
tenantId        UUID → tenants
nameEn          VARCHAR
nameAr          VARCHAR
model           VARCHAR                  -- which record type
subject         VARCHAR                  -- supports {{variables}}
bodyEn          TEXT                     -- HTML with {{variables}}
bodyAr          TEXT
fromEmail       VARCHAR
replyTo         VARCHAR
attachments     JSONB                    -- auto-attach PDF toggle per doc type
...TenantAwareEntity
```

---

### Additional Modules

---

## UPDATED TABLE COUNT

```
Original schema:      ~55 tables
Part 2 additions:     +35 tables
Part 5 additions:     +22 tables (Fleet, Manufacturing, Maintenance, Quality, Repairs, Helpdesk deferred)
─────────────────────────────────
Total:                ~112 tables across 15 domains
```

---

## UPDATED IMPLEMENTATION PROMPT

```
I'm building Tatweer, a multi-tenant SaaS ERP following Odoo patterns closely.
Architecture: one company per tenant, multi-branch.
Full validated schema: tatweer-schema.md
Full module plan: tatweer-plan.md

Rules:
- NestJS + TypeScript + TypeORM (PostgreSQL)
- MongoDB for chatter messages + followers + notifications
- All entities extend TenantAwareEntity (tenantId always injected from JWT)
- Branch-scoped entities also have branchId (from JWT, never from body)
- version field on all entities (optimistic locking)
- Soft deletes (deletedAt)
- Bilingual: nameEn + nameAr (no JSONB, no single name field)
- Sequence format: {PREFIX}/{BRANCH_CODE}/{YEAR}/{0001}
- Every financial event creates a balanced journal entry (DR = CR)
- Never delete posted entries — reversal only
- Response shape: { data, meta }

Odoo patterns to follow:
- Every record has chatter (log notes + messages)
- Every record supports activities
- Invoices separate from sale orders
- Partners unified (customer + supplier)
- Fiscal positions map taxes per partner
- Analytic accounts on journal lines
- Product variants via attribute combinations
- Anglo-Saxon accounting (COGS at delivery, not invoice)

Today's task: [MODULE] — [specific tables/endpoints]
Start with: TypeORM entities → DTOs → Service → Controller
```
