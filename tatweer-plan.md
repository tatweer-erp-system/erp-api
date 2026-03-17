# Tatweer — Master Development Plan

> Version 2.0 — Fully aligned with actual database schema
> Hand this file to Claude at the start of every session.

---

## HOW TO USE THIS DOCUMENT

Paste this file into Claude and say:

> "Continue building Tatweer. Work on Cycle N — [module name]. Follow the plan exactly."

Claude will build exactly what is specified: API endpoints, list pages, fast-create modals,
and detail pages — following Odoo patterns, aligned to the actual schema below.

---

## GLOBAL RULES (apply to every cycle)

### Market & Localization

```
Primary market:  Saudi Arabia
Base currency:   SAR
Tax system:      VAT 15% (ZATCA e-invoicing compliance)
Social ins.:     GOSI (employee 9.75% + employer 11.75% for Saudis — different for expats)
Bilingual:       Arabic (RTL primary) + English
Calendar:        Gregorian (Hijri display optional)
```

### API Rules

```
- NestJS + TypeScript + TypeORM (PostgreSQL)
- tenantId resolved from JWT middleware — never from request body
- branchId resolved from JWT middleware — never from request body
- version field required on all UPDATE/DELETE (optimistic locking)
- All responses: { data, meta } shape
- Pagination: { page, limit, total, totalPages }
- Soft delete: deletedAt column (no hard deletes)
- Bilingual: every name field = nameEn + nameAr (no JSONB, no single field)
- Multi-currency: every money transaction has currencyId + exchangeRate + amountBase (SAR)
- Sequence format: {PREFIX}/{BRANCH_CODE}/{YEAR}/{00001}
- Auth: JWT access + refresh tokens
- Role + permission system per module per action
- Module feature flags: checked from tenant.features JSONB before serving any module route
```

### Frontend Rules

```
- React 19 + Vite + TypeScript (strict)
- Ant Design 6 (sole component library)
- Tailwind CSS 4 (layout + spacing only)
- Zustand 5 (global state)
- React Query 5 (all server state)
- React Router v6
- react-hook-form 7 + zod 4 (all forms)
- Axios (HTTP)
- RTL-ready: full Arabic layout support
- Currency display: always show currency symbol + 2 decimal places
- All amounts stored and compared in base currency (SAR)
```

### Cross-Module Features (built once, used everywhere)

```
✅ Chatter + Log Notes   → on every major record detail page
✅ Activities            → schedule follow-ups on any record
✅ Fiscal Positions      → auto-remap taxes per partner
✅ Product Variants      → attribute combinations on products
✅ Bank Statements       → import + reconcile bank feeds
✅ Down Payments         → partial invoicing before delivery
✅ Email Templates       → send documents by email
✅ Print Templates       → generate PDFs for all documents
❌ Followers             → deferred
❌ Tags                  → deferred
❌ Analytic Accounts     → deferred
❌ Landed Costs          → deferred
```

### Page Pattern (Odoo-inspired)

Every entity follows this exact pattern:

```
1. LIST PAGE     → table with filters, search, bulk actions, "New" button
2. FAST CREATE   → modal with minimum required fields only
3. DETAIL PAGE   → full form with tabs, all fields, status bar, action buttons
```

### Status Bar Pattern

```
Every transactional document has a top status bar:
[Draft] → [Confirmed] → [Done/Paid] ←→ [Cancelled]
Shown as clickable breadcrumb steps at top of detail page
```

### Form Tabs Pattern

```
Tab 1: Main info / lines
Tab 2: Other Info (dates, references, notes)
Tab 3: Accounting (journal entry, payment info)
Tab 4: Log / History (chatter / activity)
```

### Module Feature Flags

```
Every module route checks tenant.features JSONB before responding.
Features: hr, inventory, crm, purchasing, projects, chat, reporting, pos, restaurant, loyalty

If feature not in tenant.features → 403 Feature not available on your plan
Frontend: hides nav items for disabled features
```

---

## SCHEMA DECISIONS (source of truth)

### Key Design Choices Already Made

**Partners split into two tables:**

```
contacts → customers (B2C and B2B buyers)
vendors  → suppliers (who you purchase from)
```

**Sales Order = Invoice:**

```
sales_orders table IS the invoice.
Has ZATCA fields (zatcaUUID, zatcaHash, zatcaQRCode, invoiceType, transactionType, taxCategory).
No separate invoices table.
```

**Stock tables:**

```
stock_levels    → current on-hand per product per warehouse (replaces stock_quants)
stock_movements → every stock change event (replaces stock_moves)
                  links back to source via referenceId + referenceType
```

**No separate deliveries table:**

```
Deliveries are represented as stock_movements with:
  movementType = 'sale_delivery'
  referenceId  = sales_order.id
  referenceType = 'sales_order'
```

**Payroll:**

```
payroll_runs  → one run per period per tenant
payroll_items → one item per employee per run (replaces payslips)
```

**Treasury (not simple bank journals):**

```
treasury_accounts     → bank accounts + cash registers
treasury_transactions → every movement in/out
bank_reconciliations  → statement matching
All linked to chart_of_accounts via coaAccountId
```

**Cost Centers:**

```
cost_centers table — hierarchical
Applied on journal_lines.costCenterId
Used for P&L by cost center / branch reporting
```

**Settings — single table:**

```
tenant_settings: (tenantId, key, value, group, type)
No branch_settings table — branch-level overrides use same table with branchId scoped key
```

**Multi-currency:**

```
Every transaction table has:
  currency    VARCHAR(10)       — transaction currency
  currencyId  UUID              — FK to currencies
  exchangeRate DECIMAL(15,6)   — rate at time of transaction
  totalAmountBase DECIMAL(15,2) — amount converted to SAR (base)
Reporting always uses base currency (SAR)
```

---

## CYCLE 1 — Auth + Users + Branches + Roles ✅ DONE

---

## CYCLE 2 — Products + Contacts + Vendors + Settings

### 2A. Products

**API Endpoints**

```
GET    /products                    list (filter: productType, categoryId, brandId, canBeSold, canBePurchased)
POST   /products                    create
GET    /products/:id                single
PUT    /products/:id                update (requires version)
DELETE /products/:id                soft delete
GET    /products/:id/stock          stock_levels per warehouse for this product
GET    /products/:id/movements      stock_movements history for this product
```

**List Page** — `ProductListPage`

```
Columns:
  Image (thumbnail 40x40)
  Name (nameEn + nameAr)
  SKU
  Brand
  Category
  Type badge (Storable | Consumable | Service | Combo)
  Unit Price (SAR)
  Cost Price
  VAT %
  On Hand (from stock_levels — storable only)
  Active toggle

Filters:
  Search (nameEn, nameAr, sku, barcode)
  productType (All | storable | consumable | service | combo)
  categoryId, brandId
  canBeSold / canBePurchased toggles
  isActive toggle

Actions:
  "New" → Fast Create modal
  Row click → detail page
  Bulk: Archive, Export
```

**Fast Create Modal** — `ProductQuickCreateModal`

```
Fields:
  nameEn (saves to both nameEn + nameAr)
  productType (storable | consumable | service | combo)
  unitPrice (SAR)
  costPrice
  categoryId
  taxRate (default 15%)

On save → redirect to detail page
```

**Detail Page** — `ProductDetailPage`

```
Header:
  Product image upload (stored in images JSONB array)
  nameEn, nameAr
  SKU, Barcode
  brandId (select)
  Active toggle

Tab 1 — General:
  productType, categoryId, unitOfMeasure
  canBeSold → unitPrice, taxRate
  canBePurchased → costPrice
  invoicePolicy (ordered | delivered)
  hasVariants, hasSerialTracking, hasLotTracking, hasExpiryDate toggles
  reorderPoint, reorderMinQty, reorderQty

Tab 2 — Inventory (storable only):
  Current stock table: Warehouse | On Hand | Reserved | Available | Avg Cost | Value
  Sourced from stock_levels joined warehouses

Tab 3 — Vendors (canBePurchased only):
  Table: Vendor | Min Qty | Price | Currency | Lead Time
  "Add vendor" inline row

Tab 4 — Combo (productType = combo only):
  Groups table: Group Name En | Group Name Ar | Sequence
  Per group → Items sub-table: Product | Extra Price | Sequence
  "Add Group" button
  Note: combo has no stock — components tracked individually

Tab 5 — Notes:
  descriptionEn (rich text — for sales)
  descriptionAr (rich text)
```

---

### 2B. Product Categories

**API Endpoints**: CRUD `/product-categories`

**List Page** — tree table: Name (En+Ar), Parent, Products Count
**Fast Create Modal** — nameEn, nameAr, parentId (optional)
**Detail Page** — nameEn, nameAr, parentId, linked accounts (income, COGS, inventory)

---

### 2C. Product Brands

**API Endpoints**: CRUD `/product-brands`

**List Page** — Name (En+Ar), Products Count, Active
**Fast Create Modal** — nameEn, nameAr
**No detail page** — inline edit in list

---

### 2D. Units of Measure

**API Endpoints**: CRUD `/units-of-measure`

**List Page** — Name (En+Ar), symbol, uomType, Active
**Fast Create Modal** — nameEn, nameAr, symbol, uomType
**No detail page** — inline edit

---

### 2E. Adjustment Reasons

**API Endpoints**: CRUD `/adjustment-reasons`

**List Page** — Name (En+Ar), type, Active
**Fast Create Modal** — nameEn, nameAr, type
**No detail page** — inline edit

---

### 2F. Contacts (Customers)

**API Endpoints**

```
GET    /contacts                    list (filter: status, assignedTo)
POST   /contacts                    create
GET    /contacts/:id                single
PUT    /contacts/:id                update
DELETE /contacts/:id                soft delete
GET    /contacts/:id/orders         sales orders for this contact
GET    /contacts/:id/statement      AR statement
```

**List Page** — `ContactsListPage`

```
Columns:
  Avatar / Initials
  Name (firstName + lastName)
  Company, Email, Phone, Position
  Status badge (active | inactive | blocked)
  Assigned To
  Outstanding AR (computed from sales_orders)

Filters: Search (name, email, phone, company), status, assignedTo
Actions: "New" → Fast Create modal
```

**Fast Create Modal**

```
Fields:
  firstName, lastName, company (free text), phone, email
  assignedTo (defaults to current user)

On save → stays on list ("Save & Open" option goes to detail)
```

**Detail Page** — `ContactDetailPage`

```
Header: Avatar | Full Name | Company | Status | Assigned To

Tab 1 — Contact Info: firstName, lastName, email, phone, company, position, status, assignedTo
Tab 2 — Sales: Sales Orders table | Outstanding balance | "New Order" button
Tab 3 — Leads: CRM leads linked to this contact
Tab 4 — Activity: lead_activities timeline + internal notes
```

---

### 2G. Vendors (Suppliers)

**API Endpoints**

```
GET    /vendors                     list
POST   /vendors                     create
GET    /vendors/:id                 single
PUT    /vendors/:id                 update
DELETE /vendors/:id                 soft delete
GET    /vendors/:id/orders          purchase orders
GET    /vendors/:id/statement       AP statement
```

**List Page**

```
Columns: Name (nameEn + nameAr) | Email | Phone | Tax Number | Payment Terms Days | Rating | Currency | Active
Filters: Search (name, email, taxNumber), isActive, rating
Actions: "New" → Fast Create
```

**Fast Create Modal** — nameEn (→ both), phone, email, taxNumber, paymentTermsDays (default 30), currencyId

**Detail Page** — `VendorDetailPage`

```
Tab 1: nameEn, nameAr, email, phone, address, taxNumber, vatNumber, crNumber,
       paymentTermsDays, currencyId, bankName, bankIban, rating
Tab 2 — Purchase Orders: Table: PO# | Date | Amount | Status | Received
Tab 3 — Products: Products supplied by this vendor
```

---

### 2H. Currencies

**API Endpoints**

```
GET    /currencies                  list
POST   /currencies                  create
PUT    /currencies/:id              update
POST   /currencies/:id/set-base     set as base currency
GET    /exchange-rates              list rates
POST   /exchange-rates              add rate
GET    /exchange-rates/latest       latest rate per pair
```

**List Page** — Code, Name (En+Ar), Symbol, Is Base badge, Decimal Places, Active
**Fast Create Modal** — code, nameEn, nameAr, symbol, decimalPlaces
**Exchange Rates sub-page**: Date | From | To | Rate | Source — "Add Rate" button

---

### 2I. Settings Page

**API Endpoints**

```
GET    /settings              all settings (grouped)
PUT    /settings              update settings (key-value patch)
GET    /settings/:group       settings for a group
```

Stored in `tenant_settings` as (tenantId, key, value).

**Settings Page** — `SettingsPage`

```
Sidebar groups:
  General | Accounting | Inventory | Sales | Purchasing | HR & Payroll | POS | Notifications

General: Company nameEn/Ar, Logo, Default language, Base currency, Timezone, Fiscal year start
Accounting: Default accounts, VAT rate, ZATCA toggle + credentials, Fiscal lock date, Anglo-Saxon
Inventory: Costing method, Negative stock block, Auto-reorder
Sales: Invoice policy, Credit limit settings
Purchasing: 3-way match, Bill control
HR & Payroll: Work days/hours, Overtime rate, GOSI %, Income tax method, EOSC, Leave settings
POS: Default payment method, Receipt template, Loyalty, Tip, Drawer settings
```

---

## CYCLE 3 — Accounting

### 3A. Chart of Accounts

**API Endpoints**

```
GET    /accounts                    list (tree or flat, filter: type, isActive)
POST   /accounts                    create
GET    /accounts/:id                single
PUT    /accounts/:id                update
DELETE /accounts/:id                soft delete (only if no journal lines)
GET    /accounts/:id/lines          journal lines for this account (paginated)
```

**List Page** — Indented tree: Code | Name (En+Ar) | Type | Normal Balance | Balance | Active
**Fast Create Modal** — code, nameEn (→ both), type, parentId, allowDirectPosting, isReconcilable
**Detail Page**:

```
Tab 1: code, nameEn, nameAr, type, subType, parentId, normalBalance,
       currency, isReconcilable, allowDirectPosting, openingBalance, openingBalanceDate
Tab 2 — Journal Lines: Date | Entry# | Description | Debit | Credit | Balance
```

---

### 3B. Cost Centers

**API Endpoints**: CRUD `/cost-centers`

**List Page** — Code, Name (En+Ar), Parent, Active
**Fast Create Modal** — code, nameEn, nameAr, parentId
**No detail page** — inline edit

---

### 3C. Fiscal Periods

**API Endpoints**

```
GET    /fiscal-periods              list (filter: fiscalYear, status)
POST   /fiscal-periods/generate     auto-generate all periods for a fiscal year
POST   /fiscal-periods/:id/close    close period
POST   /fiscal-periods/:id/reopen   reopen (admin only)
```

**List Page** — Year | Period# | Name (En+Ar) | Start | End | Status | Closed By
**No Fast Create** — periods generated in bulk via "Generate Year" button.

---

### 3D. Journal Entries (Manual)

**API Endpoints**

```
GET    /journal-entries             list (filter: type, date, isPosted, periodId)
POST   /journal-entries             create draft
GET    /journal-entries/:id         single with lines
PUT    /journal-entries/:id         update draft
POST   /journal-entries/:id/post    post (validates DR = CR)
POST   /journal-entries/:id/reset   reset to draft
POST   /journal-entries/:id/reverse create reversal
DELETE /journal-entries/:id         soft delete draft only
```

**List Page**

```
Columns: entryNumber | Date | Type | Description | Total Debit | Total Credit | Status | Period
Actions: "New Entry" → goes to detail directly (no modal)
```

**Detail Page** — `JournalEntryDetailPage`

```
Status bar: Draft → Posted → (Cancelled via Reversal)

Header: type | date | entryNumber | description | periodId

Journal Lines Tab (inline editable):
  accountId | description | costCenterId | currency | exchangeRate | debit | credit
  Footer: Total Debit | Total Credit | Difference (red if ≠ 0)

Validation on Post:
  ✓ Total Debit = Total Credit
  ✓ Date within open fiscal period
  ✓ Date not before fiscal_lock_date setting
```

---

### 3E. Treasury Accounts

**API Endpoints**

```
GET    /treasury-accounts           list (filter: type, branchId, isActive)
POST   /treasury-accounts           create
GET    /treasury-accounts/:id       single
PUT    /treasury-accounts/:id       update
GET    /treasury-accounts/:id/transactions  transaction history
GET    /treasury-accounts/:id/balance       current balance
```

**List Page** — Name (En+Ar) | Type | Branch | Bank | IBAN | Currency | Balance | Default | Active
**Fast Create Modal** — nameEn (→ both), type (cash|bank), branchId, bankName, iban, currency, coaAccountId, isDefault

**Detail Page**:

```
Tab 1: All fields
Tab 2 — Transactions: Date | Type | Reference | Contact/Vendor | Amount | Currency | Reconciled
Tab 3 — Reconciliation: bank_reconciliations list + "New Reconciliation" button
```

---

### 3F. Treasury Transactions

**API Endpoints**

```
GET    /treasury-transactions       list
POST   /treasury-transactions       create (manual)
GET    /treasury-transactions/:id   single
POST   /treasury-transactions/:id/reconcile
```

**List Page** — Date | Account | Type | Contact/Vendor | Reference | Amount | Currency | Reconciled
**Fast Create Modal** — accountId, type (deposit|withdrawal|transfer), amount, currency, exchangeRate,
contactId or vendorId, date, reference, description

---

### 3G. Bank Reconciliation

**Detail Page** — `BankReconciliationPage`

```
Header: Account | Statement Date | Opening | Closing | System Balance | Difference

Two-panel layout:
  Left:  Unreconciled treasury_transactions
  Right: Bank statement lines (imported or manual)
"Auto-Match" | Manual match | "Complete" (only when difference = 0)
```

---

## CYCLE 4 — Inventory

### 4A. Warehouses

**API Endpoints**: CRUD `/warehouses`

**List Page** — Name (En+Ar), Branch, Location, Allow Negative Stock, Active
**Fast Create Modal** — nameEn, nameAr, branchId, location, allowNegativeStock
**Detail Page**: Tab 1: all fields | Tab 2 — Stock Levels: Product | On Hand | Reserved | Avg Cost | Value

---

### 4B. Stock Levels (Read-Only View)

**API Endpoints**

```
GET    /stock-levels                list (filter: productId, warehouseId)
GET    /stock-levels/value          total inventory value
```

**List Page** — Product | Warehouse | On Hand | Reserved | Available | Avg Cost | Last Cost | Value
Filters: Product, Warehouse, Category | "Export" button | "Adjust" per row quick action

---

### 4C. Stock Movements (Audit Log)

**API Endpoints**

```
GET    /stock-movements             list (filter: productId, warehouseId, movementType, date)
GET    /stock-movements/:id         single
```

**List Page** — read-only audit log.

```
Columns: Date | Product | Warehouse | Type | Qty | Before | After | Unit Cost | Reference | Branch
movementType values:
  purchase_receipt | sale_delivery | adjustment | transfer_out | transfer_in
  return_to_vendor | customer_return | scrap | opening_stock
```

---

### 4D. Inventory Adjustments

**API Endpoints**

```
GET    /inventory-adjustments       list
POST   /inventory-adjustments       create
GET    /inventory-adjustments/:id   single with lines
PUT    /inventory-adjustments/:id   update (open only)
POST   /inventory-adjustments/:id/validate  → creates stock_movements
POST   /inventory-adjustments/:id/cancel
```

**Fast Create Modal** — warehouseId, adjustmentReasonId, date, reference

**Detail Page**

```
Status bar: Open → Validated → Cancelled

Lines Tab:
  Product | On Hand (read-only) | Counted Qty | Difference | Unit Cost | Impact
  "Add line" button

On Validate:
  ✓ stock_movements per line (adjustment_in | adjustment_out)
  ✓ stock_levels updated (quantity, averageCost)
  ✓ journal_entry created (inventory account adjustment)
```

---

### 4E. Reorder Rules

**API Endpoints**: CRUD `/reorder-rules`

**List Page** — Product | Warehouse | Min Qty | Max Qty | On Hand | Lead Time | Vendor
**Fast Create Modal** — productId, warehouseId, reorderMinQty, reorderQty, vendorId, leadTimeDays
**No detail page** — inline edit. "Run Reorder" bulk action button.

---

### 4F. Inter-Branch Transfers

**API Endpoints**

```
GET    /transfers                   list
POST   /transfers                   create
GET    /transfers/:id               single
PUT    /transfers/:id               update
POST   /transfers/:id/validate-out  departure → stock_movements type=transfer_out
POST   /transfers/:id/validate-in   arrival → stock_movements type=transfer_in
POST   /transfers/:id/cancel
```

**Fast Create Modal** — fromWarehouseId, toWarehouseId, scheduledDate, note

**Detail Page**

```
Status bar: Draft → In Transit → Done → Cancelled
Lines: Product | Qty Requested | Qty Sent | Qty Received | UoM
Two buttons: [Validate Departure] [Validate Arrival]
Note: No accounting entry (same company)
```

---

## CYCLE 5 — Sales

### 5A. Sale Orders (= Invoices)

**API Endpoints**

```
GET    /sales-orders                list (filter: status, contactId, branchId, date, invoiceType)
POST   /sales-orders                create
GET    /sales-orders/:id            single with lines
PUT    /sales-orders/:id            update (draft only)
POST   /sales-orders/:id/confirm    confirm → reserve stock
POST   /sales-orders/:id/deliver    validate delivery → stock_movements + COGS
POST   /sales-orders/:id/post       post as invoice → journal entry + ZATCA
POST   /sales-orders/:id/cancel     cancel → release stock reservation
POST   /sales-orders/:id/credit-note create credit note
POST   /sales-orders/:id/register-payment
DELETE /sales-orders/:id            soft delete (draft only)
```

**List Page** — `SalesOrdersListPage`

```
Tabs: Quotations | Orders | Invoices | Credit Notes

Columns:
  orderNumber | Date | Contact | Amount (currency) | Amount (SAR) | Status badge
  invoiceType badge | ZATCA status

Filters: Search, status, invoiceType, zatcaStatus, date range, branchId
Actions: "New" → Fast Create | Bulk: Post, Export | "Submit to ZATCA" bulk
```

**Fast Create Modal**

```
Fields: contactId, currencyId, invoiceType (standard | simplified)
One line: productId | quantity | unitPrice
On save → redirect to detail
```

**Detail Page** — `SalesOrderDetailPage`

```
Status bar: Draft → Confirmed → Delivered → Posted → Paid → Cancelled
ZATCA status bar (separate): Pending → Submitted → Cleared | Rejected

Header:
  contactId (locked once confirmed)
  orderNumber, date, dueDate
  currencyId, exchangeRate
  invoiceType, transactionType, supplyType
  taxCategory, taxExemptionCode, taxExemptionReason
  originalInvoiceId (credit notes only)

Order Lines Tab (locked once confirmed):
  productId | description | quantity | unitPrice
  discountType | discountValue | discountAmount
  taxRate | taxAmount | lineTotal | lineTotalBase (SAR)
  Footer: Subtotal | Discount | Tax (15% VAT) | Total (currency) | Total (SAR)

Other Info Tab: branchId, deliveryAddress, order-level discount, notes

Accounting Tab (once posted):
  Journal entry reference + lines (DR AR | CR Revenue | CR VAT Payable)
  ZATCA fields: zatcaUUID | zatcaHash | zatcaQRCode | zatcaInvoiceCounter

Payments Tab:
  Registered payments | "Register Payment" button

Action Buttons:
  Draft:     [Confirm] [Discard]
  Confirmed: [Validate Delivery] [Cancel]
  Delivered: [Post as Invoice] [Cancel]
  Posted:    [Register Payment] [Credit Note] [Submit to ZATCA] [Print]
  Paid:      [Print] [Credit Note]

On Confirm: sequence assigned + stock reserved
On Validate Delivery: stock_movements (sale_delivery) + stock_levels updated + COGS entry
On Post: AR journal entry + ZATCA fields populated + counter incremented

Register Payment Modal:
  treasuryAccountId, paymentDate, amount, currency, exchangeRate, reference
```

---

## CYCLE 6 — Purchasing

### 6A. Purchase Orders

**API Endpoints**

```
GET    /purchase-orders             list (filter: status, vendorId, branchId, date)
POST   /purchase-orders             create (as RFQ)
GET    /purchase-orders/:id         single with lines
PUT    /purchase-orders/:id         update (draft only)
POST   /purchase-orders/:id/confirm confirm → PO status
POST   /purchase-orders/:id/receive validate receipt → stock_movements + valuation
POST   /purchase-orders/:id/bill    create vendor bill
POST   /purchase-orders/:id/cancel
```

**List Page**

```
Tabs: RFQs | Purchase Orders

Columns: orderNumber | Date | Vendor | Scheduled Date | Amount (currency) | Amount (SAR)
         Receipt Status (pending|partial|received) | Bill Status | Status

Actions: "New" → Fast Create
```

**Fast Create Modal** — vendorId, currencyId, orderDate, expectedDeliveryDate
One line: productId | quantity | unitPrice

**Detail Page** — `PurchaseOrderDetailPage`

```
Status bar: RFQ → Purchase Order → Received → Billed → Cancelled

Header: vendorId, orderNumber, orderDate, expectedDeliveryDate, receivedAt, currencyId, exchangeRate, invoiceNumber

Order Lines Tab:
  productId | description | quantity | unitPrice | discountAmount | taxAmount | lineTotal | lineTotalBase
  receivedQuantity (read-only) | "Add line"
  Footer: Subtotal | Tax | Total (currency) | Total (SAR)

Receipts Tab: stock_movements of type purchase_receipt + "Receive" button
Bills Tab: vendor bills linked to PO + "Create Bill" button

On Receive:
  ✓ stock_movements (purchase_receipt)
  ✓ stock_levels updated + AVCO recalculated
  ✓ Inventory valuation entry (DR Inventory / CR AP)
  ✓ 3-way match check if enabled
```

---

## CYCLE 7 — HR

### 7A. Employees

**API Endpoints**

```
GET    /employees                   list (filter: branchId, departmentId, employmentType, isActive)
POST   /employees                   create
GET    /employees/:id               single
PUT    /employees/:id               update
DELETE /employees/:id               soft delete
GET    /employees/:id/contracts     list contracts
GET    /employees/:id/attendance    attendance records
GET    /employees/:id/leaves        leave balance + requests
GET    /employees/:id/payroll       payroll_items history
GET    /employees/:id/training      training records
```

**Fast Create Modal**

```
Fields: userId (optional), positionEn, positionAr, departmentId, branchId,
        employmentType, hireDate, isSaudi, basicSalary, housingAllowance, transportationAllowance
```

**Detail Page** — `EmployeeDetailPage`

```
Tab 1 — Work Info: position, department, manager, branch, employmentType, hireDate, employeeNumber, nationality, isSaudi, userId
Tab 2 — Compensation: basicSalary, housingAllowance, transportationAllowance, active contract summary
Tab 3 — Contracts: Table + "New Contract" button
Tab 4 — Attendance: Table with date range filter
Tab 5 — Leaves: Balance table + Requests table
Tab 6 — Payroll: payroll_items table
Tab 7 — Training: training_records table
Tab 8 — Documents: File uploads
```

---

### 7B–7K. HR Masters (all simple list + fast create, no detail page)

```
Shifts          → nameEn/Ar, startTime, endTime, breakMinutes, workingDays, isOvernight
Job Titles      → nameEn/Ar, departmentId, grade
Employment Types → nameEn/Ar
Leave Types     → nameEn/Ar, daysPerYear, isPaid, requiresApproval
Public Holidays → nameEn/Ar, date, isRecurring
Termination Reasons → nameEn/Ar, type (voluntary|involuntary)
```

---

### 7L. Employee Contracts

**Detail Page**

```
Status bar: Draft → Active → Expired → Cancelled

Tab 1: employeeId, contractType, startDate, endDate,
       basicSalary, housingAllowance, transportationAllowance, salaryCurrency
Tab 2 — Payroll History: payroll_items generated under this contract
```

---

### 7M. Leave Requests

**List Page** — Views: My Leaves | My Team | All (HR) | Calendar View toggle
**Fast Create Modal** — employeeId, leaveType, startDate, endDate, reason. Live balance shown.

**Detail Page**

```
Status bar: Pending → Approved / Rejected
Fields + approvedBy, approvedAt, rejectionReason
Balance impact: "Uses X days. Remaining: Y days"
```

---

### 7N. Attendance Records

**List Page** — Employee | Date | Clock In | Clock Out | Hours | Late Min | Overtime | Status | Source
**Fast Create Modal** — employeeId, date, clockIn, clockOut, note
**Kiosk endpoints**: POST /attendance/clock-in | POST /attendance/clock-out (by employee pin)

---

### 7O. Training Records

**API Endpoints**: CRUD `/training-records`
**List Page** — Employee | Course | Provider | Type | Period | Status | Score | Certificate
**Fast Create Modal** — employeeId, courseName, provider, trainingType, startDate, endDate, cost
**Detail Page** — All fields + certificateNumber, certificateUrl, certificateExpiry, passed, score

---

## CYCLE 8 — Payroll

### 8A. Payroll Runs

**API Endpoints**

```
GET    /payroll-runs                list (filter: status, periodStart)
POST   /payroll-runs                create + auto-generate items for all employees
GET    /payroll-runs/:id            single with items
POST   /payroll-runs/:id/compute    recompute all items
POST   /payroll-runs/:id/approve    approve → journal entry
POST   /payroll-runs/:id/reset      reset to draft
POST   /payroll-runs/:id/cancel
```

**Fast Create Modal**

```
Fields: periodStart, periodEnd, branchId (optional), currency (default SAR)

On save:
  ✓ Creates payroll_run
  ✓ Auto-generates payroll_items for all active employees with active contracts
  ✓ Runs computation immediately
  → Redirect to run detail
```

**Detail Page** — `PayrollRunDetailPage`

```
Status bar: Draft → Approved → Cancelled

Summary cards: Total Employees | Total Gross | Total GOSI | Total Net

Payroll Items Tab:
  Employee | Basic | Housing | Transport | Other | Gross
  GOSI Emp | Tax | Late | Absence | Loan | Other Deductions | Total Deductions
  Net | GOSI Employer | Payment Status
  Click row → employee payslip drawer

Accounting Tab (once approved):
  DR Salary Expense | CR GOSI Payable | CR Tax Payable | CR Salary Payable

Action Buttons:
  Draft: [Compute All] [Approve] [Discard]
  Approved: [Print All] [Export Bank File (SIF)]

GOSI:
  Saudi:     employee 9.75% + employer 11.75%
  Non-Saudi: employee 0%   + employer 11.75%
  Base: grossSalary (from tenant settings)
NET = gross - gosiEmployee - incomeTax - lateDeductions - absenceDeductions - loanDeductions - otherDeductions
```

---

## CYCLE 9 — CRM

### 9A. Leads & Opportunities

**API Endpoints**

```
GET    /leads                       list + kanban
POST   /leads                       create
GET    /leads/:id                   single with activities
PUT    /leads/:id                   update
POST   /leads/:id/convert           lead → opportunity
POST   /leads/:id/won               mark won + create sales_order
POST   /leads/:id/lost              mark lost (lostReason required)
DELETE /leads/:id                   soft delete

POST   /lead-activities             log activity
```

**List Page / Kanban** — `CRMPage`

```
Default: Kanban. Toggle: List | Kanban.
Stages: new | contacted | qualified | proposal | negotiation | won | lost

Card: title | contact | value (currency) | assignedTo | activity indicator
Drag between columns → updates status + logs lead_activity

Filters: Assigned to me | My Team | Won | Lost | Date range | Priority
Pipeline header: total count + weighted value
```

**Fast Create Modal** — title, contactId, value, currencyId, status, priority, assignedTo, expectedCloseDate

**Detail Page** — `LeadDetailPage`

```
Status bar: New → Contacted → Qualified → Proposal → Negotiation → Won / Lost

Tab 1: contactId, value, currencyId, valueBase, expectedCloseDate, source, medium, campaign, description
Tab 2 — Activities: timeline of lead_activities + "Log Activity" button
Tab 3 — Documents: linkedSalesOrderId (once won) + uploads

[Won] → creates sales_order, sets wonAt, linkedSalesOrderId
[Lost] → modal: lostReason required
```

---

## CYCLE 10 — POS

### 10A. POS Terminals, Cashiers, Sessions

**Terminals**: CRUD `/pos-terminals`
List: Name (En+Ar), Branch, Active, Last Seen
Fast Create: nameEn, nameAr, branchId, settings

**Cashiers**: CRUD `/pos-cashiers`
List: Display Name | User | Max Discount % | Can Refund | Can Void | Active
Fast Create: userId, displayName, pin, maxDiscountPct, canRefund, canVoid, canOpenDrawer

**Sessions**:

```
POST /pos-sessions/open      → open session (cashierId, terminalId, openingFloat)
POST /pos-sessions/:id/close → close session (closingFloat)
GET  /pos-sessions/:id/summary → Z-Report data
```

List: Cashier | Terminal | Branch | Opened | Closed | Opening Float | Closing Float | Difference | Status

---

### 10B. POS Orders

**API Endpoints**

```
GET    /pos-orders                  list
POST   /pos-orders                  create
GET    /pos-orders/:id              single with items + payments
PUT    /pos-orders/:id              update (open only)
POST   /pos-orders/:id/pay          finalize
POST   /pos-orders/:id/hold         hold
POST   /pos-orders/:id/void         void (manager override if needed)
POST   /pos-orders/sync-offline     sync offline orders (offlineId deduplication)
```

**POS Interface** (`tatweer-app/pos-web` + `tatweer-app/pos-desktop`):

```
Layout: product grid (left) + cart (right)
Product grid: branch-scoped products | search | category tabs
Combo product → opens group selection modal before adding
Cart: product | qty | unit price | discount | line total
Payment panel: cash | card | split | loyalty points | gift card | voucher
Receipt: print or digital
Offline mode: IndexedDB → sync via offlineId on reconnect
Table mode (restaurant): links orderId to tableId
```

---

### 10C. POS Supporting Endpoints

```
POST   /pos-refunds             create refund (requires approvedBy)
GET    /cash-movements          list (filter: sessionId)
POST   /cash-movements          cash in / cash out
POST   /manager-overrides       log override (discount|void|refund|open drawer)
GET    /pos-held-orders         list held orders (filter: sessionId)
POST   /pos-held-orders         hold cart
GET    /pos-held-orders/:id     restore snapshot
DELETE /pos-held-orders/:id     discard hold
```

---

## CYCLE 11 — Restaurant

### 11A. Sections & Tables

**Floor Plan Page** — `RestaurantFloorPlanPage`

```
Visual drag-and-drop floor plan per section (branchId scoped)
Table shapes: square | circle | rectangle
Color: available (green) | occupied (orange) | reserved (blue) | cleaning (grey)
Click occupied → current pos_order
"New Table" Fast Create: number, capacity, shape, section, posX, posY
```

**API Endpoints**:

```
CRUD /restaurant-sections   (filter: branchId)
CRUD /restaurant-tables     (filter: sectionId, status)
PUT  /restaurant-tables/:id/status
POST /table-sessions        open (seat guests)
PUT  /table-sessions/:id/release
```

---

### 11B. Kitchen Display

**Kitchen Display Page** — `KitchenDisplayPage`

```
Card view grouped by status: pending | preparing | ready | served
Card: orderNumber | table | items | course | priority | time elapsed
Red if > threshold time
```

**API Endpoints**:

```
GET  /kitchen-tickets           list (filter: status, station)
POST /kitchen-tickets           create (auto from POS)
PUT  /kitchen-tickets/:id/status update status
```

---

## CYCLE 12 — Loyalty, Vouchers & Gift Cards

### 12A. Loyalty Programs

**API Endpoints**: CRUD `/loyalty-programs`
**Fast Create**: nameEn, nameAr, pointsPerCurrency, currencyPerPoint, expiryDays, minRedeemPoints
**Detail Page**:

```
Tab 1: Program settings
Tab 2 — Tiers: nameEn/Ar | minPoints | earnMultiplier | redeemMultiplier | color | benefits — "Add Tier"
Tab 3 — Members: loyalty_accounts table
```

**Loyalty Accounts**: `GET /loyalty-accounts` + manual adjust endpoint
**Loyalty Transactions**: read-only log per account

---

### 12B. Vouchers

**API Endpoints**: CRUD `/vouchers` + `POST /vouchers/validate` (POS use)
**Fast Create**: code (or auto), nameEn, nameAr, discountType, discountValue, minOrderAmount, validFrom, validUntil, maxUses
**List Page** — Code | Name | Type | Discount | Min Order | Uses | Valid Period | Active

---

### 12C. Gift Cards

**API Endpoints**: CRUD `/gift-cards` + `GET /gift-cards/balance/:code` + `POST /gift-cards/:id/topup`
**Fast Create**: code (or auto), initialBalance, recipientName, recipientEmail, recipientPhone, expiresAt
**List Page** — Code | Recipient | Initial | Current Balance | Issued | Expires | Active

---

## CYCLE 13 — Projects & Tasks

### 13A. Projects

**API Endpoints**: CRUD `/projects`
**Fast Create**: nameEn, nameAr, managerId, startDate, endDate, budget, status
**Detail Page**:

```
Tab 1: nameEn, nameAr, status, managerId, startDate, endDate, budget
Tab 2 — Members: userId | role | "Add Member"
Tab 3 — Tasks: kanban or list
Tab 4 — Time: task_time_entries grouped by member
```

---

### 13B. Tasks

**API Endpoints**: CRUD `/tasks` + `POST /tasks/:id/time`
**Fast Create**: titleEn, titleAr, projectId, assignedTo, dueDate, priority, parentTaskId
**Kanban columns**: todo | in_progress | review | done
**Detail Page**:

```
Status, priority, assignedTo, dueDate
descriptionEn, descriptionAr (rich text)
Estimated vs logged hours
Time entries: User | Hours | Date | Description + "Log Time" button
Subtasks list
```

---

## CYCLE 14 — Reports & Dashboard

### 14A. Dashboard

```
Filters: Branch | Date Range | Compare Period
KPIs: Today's Revenue (SAR) | Open Orders | Overdue AR | Cash Balance | Stock Value
Charts: Revenue vs Expenses | Top 5 Contacts | AR Aging | Inventory by Category
Quick panels: Overdue invoices | Pending receipts | Pending leaves | Reorder alerts | ZATCA pending
```

### 14B. Financial Reports

```
Profit & Loss        GET /reports/profit-loss     filter: dateFrom, dateTo, branchId, costCenterId
Balance Sheet        GET /reports/balance-sheet   filter: asOfDate, branchId
Aged Receivables     GET /reports/aged-receivables filter: asOfDate, contactId
Aged Payables        GET /reports/aged-payables   filter: asOfDate, vendorId
General Ledger       GET /reports/general-ledger  filter: dateFrom, dateTo, accountId, branchId
Trial Balance        GET /reports/trial-balance   filter: dateFrom, dateTo, branchId

All: Export PDF | Excel
```

### 14C. Operational Reports

```
Inventory Valuation  GET /reports/stock-valuation        Product | Warehouse | On Hand | Avg Cost | Value
Stock Movements      GET /reports/stock-movements-report filter: productId, movementType, date
Payroll Summary      GET /reports/payroll-summary        Period | Employee | Gross | GOSI | Tax | Net | Export SIF
Sales Analysis       GET /reports/sales                  by Product | Contact | Branch | Period
ZATCA Report         GET /reports/zatca                  Invoice# | Date | Total | VAT | Status | Export XML
```

---

## CYCLE 15 — Notifications & GDPR

### Notifications

```
GET    /notifications               list (current user, filter: isRead, type)
POST   /notifications/:id/read      mark read
POST   /notifications/read-all
GET    /notification-preferences    user preferences
PUT    /notification-preferences    update

UI: Bell icon in header with unread badge
Dropdown: last 10 notifications | "Mark all read" | "View all"
Preferences page: toggle per event per channel (in-app | email | push)
```

### GDPR

```
POST   /consent                     record consent
POST   /consent/revoke              revoke
POST   /erasure-requests            request erasure
GET    /erasure-requests/:id        status
```

---

## BRANCH-PRODUCT ASSIGNMENT

### Data Model

```
branch_products:
  id, tenantId, branchId, productId
  UNIQUE(tenantId, branchId, productId)
```

### Filter Rule (everywhere)

```sql
SELECT * FROM products
WHERE tenantId = :tenantId
AND id IN (SELECT productId FROM branch_products WHERE branchId = :currentBranchId)
```

Tenant admin bypasses this filter.

### Affected Pages

```
ProductListPage | Sale Order lines | Purchase Order lines
Inventory Adjustments | Reorder Rules | POS product grid
Stock Levels view | Sales by Product report
```

### Branch Detail — Products Tab

```
Ant Design Transfer component:
  Left: All company products | Right: Assigned to this branch
  [Save Assignment]
```

---

## COMBO PRODUCTS

### Data Model

```
combo_groups:      id, tenantId, productId (the combo), nameEn, nameAr, sequence
combo_group_items: id, tenantId, groupId, productId (option), extraPrice, sequence
```

### Rules

```
Combo: productType='combo', no stock itself
POS: adds combo → selection modal (one choice per group)
Sale Order: combo line explodes into component lines on confirm
Stock moves: created per storable component
Price: defined unitPrice on combo + extraPrice per upgrade
```

---

## ZATCA E-INVOICING

### Rules

```
invoiceType:     standard (B2B ≥ SAR 1,000) | simplified (B2C < SAR 1,000)
transactionType: invoice | debit_note | credit_note
supplyType:      goods | services | mixed
taxCategory:     S (15%) | Z (zero rated) | E (exempt) | O (outside scope)

Every posted sales_order must have:
  zatcaUUID            → generated UUID
  zatcaHash            → SHA-256 of invoice XML
  zatcaQRCode          → TLV-encoded QR
  zatcaInvoiceCounter  → sequential, never reset

Standard (B2B):  submit to ZATCA Fatoora → cleared
Simplified (B2C): QR code only, no submission
```

---

## SHARED COMPONENT LIBRARY

```
<StatusBadge status />
<AmountDisplay amount currency showBase />   — shows + SAR base if different currency
<CurrencySelect />
<ExchangeRateInput />
<ZATCAStatusBadge status />
<BranchTag branch />
<ContactLink id name />
<VendorLink id name />
<DocumentLink model id ref />
<PageHeader title actions breadcrumb />
<FilterBar fields onFilter />
<DataTable columns data pagination onRow />
<FastCreateModal title fields schema onSave />
<DetailLayout statusBar header tabs />
<StatusBar steps current />
<InlineEditableTable columns value onChange addLabel />
<ChatterPanel recordId model />
<ActivityWidget recordId model />
<PrintButton recordId model />
<MoneyInput currency />
<DateRangePicker />
<ContactSelect />
<VendorSelect />
<ProductSelect branchScoped />
<AccountSelect type />
<TreasuryAccountSelect type />
<WarehouseSelect />
<EmployeeSelect branchId />
<ComboSelectionModal product onConfirm />
<FloorPlanTable table onClick />
<KitchenTicketCard ticket onStatusChange />
<FeatureGate feature />   — hides children if feature not in tenant.features
```

---

## FILE STRUCTURE

### API (NestJS)

```
src/modules/
  products/           product, product-category, product-brand, uom, adjustment-reason, combo-group, combo-group-item
  contacts/
  vendors/
  currencies/         currency, exchange-rate
  settings/           tenant-setting
  accounting/
    chart-of-accounts/
    cost-centers/
    fiscal-periods/
    journal-entries/  journal-entry, journal-line
    treasury/         treasury-account, treasury-transaction, bank-reconciliation
  inventory/
    warehouses/
    stock-levels/
    stock-movements/
    adjustments/
    reorder-rules/
    transfers/
  sales/              sales-order, sales-order-line
  purchasing/         purchase-order, purchase-order-line
  hr/
    employees/ departments/ shifts/ job-titles/ employment-types/
    leave-types/ leave-requests/ attendance/ contracts/ training/
    public-holidays/ termination-reasons/
  payroll/            payroll-run, payroll-item
  crm/                lead, lead-activity
  pos/
    terminals/ cashiers/ sessions/ orders/ refunds/
    held-orders/ cash-movements/ manager-overrides/ receipt-templates/
  restaurant/         section, table, table-session, kitchen-ticket
  loyalty/            loyalty-program, loyalty-tier, loyalty-account, loyalty-transaction
  vouchers/           voucher, voucher-type, voucher-redemption
  gift-cards/         gift-card, gift-card-transaction
  projects/           project, project-member, task, task-time-entry
  notifications/      notification, template, preference, outbox, fcm-token
  branch-products/    branch-product
  reports/            profit-loss/ balance-sheet/ aged/ general-ledger/ trial-balance/
                      inventory/ payroll/ sales/ zatca/
src/common/
  decorators/   branch.decorator, current-user.decorator, tenant.decorator
  guards/       jwt-auth.guard, permissions.guard, feature-flag.guard
  interceptors/ transform.interceptor, tenant.interceptor
  middleware/   branch.middleware, tenant.middleware
  pipes/        validation.pipe
```

### Frontend (React)

```
src/modules/
  products/ contacts/ vendors/ currencies/ settings/
  accounting/   pages: ChartOfAccountsPage, JournalEntriesPage, JournalEntryDetailPage,
                       TreasuryPage, TreasuryDetailPage, BankReconciliationPage, FiscalPeriodsPage
  inventory/    pages: WarehousesPage, StockLevelsPage, StockMovementsPage,
                       AdjustmentsPage, ReorderRulesPage, TransfersPage
  sales/        pages: SalesOrdersPage, SalesOrderDetailPage
  purchasing/   pages: PurchaseOrdersPage, PurchaseOrderDetailPage
  hr/           pages: EmployeesPage, EmployeeDetailPage, ContractsPage, LeavesPage, AttendancePage, TrainingPage
  payroll/      pages: PayrollRunsPage, PayrollRunDetailPage
  crm/          pages: CRMPage, LeadDetailPage
  pos/          pages: POSPage, SessionsPage, TerminalsPage, CashiersPage
  restaurant/   pages: FloorPlanPage, KitchenDisplayPage
  loyalty/      pages: LoyaltyProgramsPage, VouchersPage, GiftCardsPage
  projects/     pages: ProjectsPage, ProjectDetailPage, TasksPage, TaskDetailPage
  reports/      pages: DashboardPage, ProfitLossPage, BalanceSheetPage, AgedPage,
                       GeneralLedgerPage, TrialBalancePage, InventoryReportsPage,
                       PayrollReportPage, SalesReportPage, ZATCAReportPage
  notifications/ components: NotificationBell, NotificationPreferences
src/shared/components/ hooks/ types/ utils/
  utils/currency.utils  — formatMoney, convertToBase
  utils/zatca.utils     — generateQR, generateHash
src/store/   auth.store, branch.store, ui.store
src/router/  index, routes
```

---

## SESSION PROMPT TEMPLATE

```
I'm building Tatweer, a multi-tenant SaaS ERP for Saudi SMEs.
Full spec + schema decisions are in tatweer-plan.md (attached).

Today's task: Build Cycle [N] — [Module Name]

Rules:
- Follow the plan exactly (schema, endpoints, page patterns)
- NestJS + TypeORM for API | React 19 + Ant Design 6 for frontend
- All money: currency + currencyId + exchangeRate + amountBase (SAR)
- Bilingual: nameEn + nameAr on every entity
- tenantId + branchId from JWT middleware only
- ZATCA compliance on all sales_orders
- Branch-product filter on all product selectors
- Feature flag check on all module routes

Start with: [specific entity or step]
```

---

## 26. Odoo UI Patterns (apply to every module)

### Chatter (on every detail page)

```
All detail pages have a Chatter panel at the bottom:

  ┌─────────────────────────────────────┐
  │  Send message   Log note            │
  ├─────────────────────────────────────┤
  │  📎 Attach  ✉ Email  👤 Followers  │
  ├─────────────────────────────────────┤
  │  [Timeline of messages + log notes] │
  │  Each entry: avatar | name | date   │
  │  Message: visible to followers      │
  │  Log note: internal only (yellow)   │
  └─────────────────────────────────────┘

Component: <ChatterPanel model="invoice" recordId={id} />
Stored in MongoDB
```

### Activities Widget (on every record)

```
Shows on:
  - List page: activity due date icon per row (green/orange/red)
  - Detail page: dedicated Activities section above chatter

Activity card shows:
  Type icon | Summary | Due date | Assigned to | Mark done button

"Schedule Activity" button → modal:
  Activity Type | Summary | Due Date | Assigned To | Note
```

### Tags (on list + detail pages)

```
Applicable models: partner, product, lead, sale_order, invoice

On detail page: tag multi-select with color dots
On list page: colored tag badges per row
Filter by tag in list page filters bar
```

### Analytic Distribution Widget

```
On journal_lines, invoice_lines, expense lines:
  Shows: Analytic Account selector with % split
  Example: "Project Alpha 60% | Marketing 40%"
  Validation: must sum to 100% if plan is mandatory
```

### Fiscal Position (auto-applied)

```
When partner has fiscalPositionId set:
  On SO/Invoice creation → auto-map taxes via fiscal_position_taxes
  On SO/Invoice creation → auto-map accounts via fiscal_position_accounts
  Shown as info banner on order/invoice: "Fiscal position: Export"
```

### Product Variants Selector

```
On sale order / invoice / PO lines:
  Select product → if hasVariants = true
  → show attribute selectors (Color: [Red|Blue], Size: [S|M|L])
  → resolves to specific product_variant
  → price = base price + priceExtra
```

### Bank Reconciliation Page

```
Two-panel layout (like Odoo):
  Left: Bank statement lines (imported or manual)
  Right: Matched journal entries / payments

Auto-match by: amount + date proximity + partner
Manual match: click statement line → select payment/entry
Green = matched | Orange = partial | Red = unmatched

"Validate" → marks statement line as reconciled + posts journal entry
```

---

## CYCLE 12 — Expenses

**List Pages:**

- My Expenses: Name | Date | Category | Amount | Status
- All Expenses: + Employee column
- Expense Reports: Name | Employee | Total | Status

**Fast Create — Expense:**

```
Fields:
  Name / Description
  Category
  Date
  Total Amount
  Receipt (photo upload)
  Payment Mode (My Account | Company)
```

**Detail Page — Expense Report:**

```
Status bar: Draft → Submitted → Approved → Posted → Done

Header: Report Name | Employee | Total

Tab 1 — Expenses:
  Table of all expense lines: Name | Date | Category | Amount | Receipt
  "Add Expense" button

Actions:
  Draft:    [Submit to Manager]
  Submitted: [Approve] [Refuse] (manager)
  Approved: [Post Journal Entries] (accountant)
  Posted:   [Register Payment] (reimburse employee)
```

---

## CYCLE 15 — Subscriptions

**List Page:** Partner | Plan | Status | Next Invoice | Total/Period

**Fast Create:**

```
Fields:
  Partner
  Plan (Monthly | Quarterly | Annual)
  Start Date
  Product lines (1 line minimum)
```

**Detail Page:**

```
Status bar: Draft → Active → Paused → Cancelled

Header: Partner | Plan | Next Invoice Date | MRR (monthly recurring revenue)

Tab 1 — Lines:
  Product | Description | Qty | Unit Price | Subtotal

Tab 2 — Invoices:
  Table of generated invoices
  "Generate Invoice" button (manual) — auto on next_invoice_date

Actions:
  Active: [Pause] [Close] [Generate Invoice Now]
```

---

## UPDATED SESSION PROMPT TEMPLATE

```
I'm building Tatweer, a multi-tenant SaaS ERP following Odoo patterns.
Architecture: one company per tenant, multi-branch.

Attached files:
  tatweer-plan.md   → full UI plan for all 15 cycles
  tatweer-schema.md → full validated database schema

Tech stack:
  API:      NestJS + TypeScript + TypeORM (PostgreSQL) + Mongoose (MongoDB)
  Web:      React 19 + Vite + TypeScript + Ant Design 6 + Tailwind 4
  State:    Zustand 5 + React Query 5
  Forms:    react-hook-form 7 + zod 4

Core rules:
  - tenantId + branchId from JWT only (never from request body)
  - version on all entities (optimistic locking)
  - nameEn + nameAr on all name fields (no JSONB, no single name)
  - Sequence: {PREFIX}/{BRANCH_CODE}/{YEAR}/{0001}
  - Every financial event = balanced journal entry (DR = CR always)
  - Never delete posted entries — reversal only
  - Chatter (MongoDB) on every major record
  - Activities on every major record
  - Soft deletes everywhere

Today's task: Cycle [N] — [Module Name] — [specific entity]
Deliver: TypeORM entities → DTOs → Service → Controller → List Page → Fast Create Modal → Detail Page
```
