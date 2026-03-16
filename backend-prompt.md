# Tatweer (تطوير) — Master Development Plan

> Version 1.0 — Complete UI + API blueprint for all 10 cycles
> Hand this file to Claude at the start of every session.

---

## HOW TO USE THIS DOCUMENT

Paste this file into Claude and say:

> "Continue building Tatweer. Work on Cycle N — [module name]. Follow the plan exactly."

Claude will build exactly what is specified here: API endpoints, list pages, fast-create modals, and detail pages — following Odoo patterns throughout.

---

## GLOBAL RULES (apply to every cycle)

### API Rules

```
- NestJS + TypeScript + TypeORM (PostgreSQL)
- branchId comes from JWT middleware ONLY — never from request body
- version field required on all UPDATE/DELETE (optimistic locking)
- All responses: { data, meta } shape
- Pagination: { page, limit, total, totalPages }
- Soft delete: deletedAt column (no hard deletes)
- Bilingual: every name field = nameEn + nameAr (no JSONB)
- Sequence format: {PREFIX}/{BRANCH_CODE}/{YEAR}/{0001}
- Auth: JWT access + refresh tokens
- Role-based permissions per module per action (read/create/update/delete)
```

### Frontend Rules

```
- React 19 + Vite + TypeScript (strict)
- Ant Design 6 (sole component library — no custom components if AntD has it)
- Tailwind CSS 4 (layout + spacing only)
- Zustand 5 (global state)
- React Query 5 (all server state)
- React Router v6 (routing)
- react-hook-form 7 + zod 4 (all forms)
- Axios (HTTP)
- RTL-ready: all pages support Arabic layout
```

### Page Pattern (Odoo-inspired)

Every entity follows this exact pattern:

```
1. LIST PAGE        → table with filters, search, bulk actions, "New" button
2. FAST CREATE      → modal with minimum required fields only (opens from "New" button)
3. DETAIL PAGE      → full form with tabs, all fields, status bar, action buttons
```

### Status Bar Pattern

Every transactional document has a top status bar:

```
[Draft] → [Confirmed] → [Done/Paid] ←→ [Cancelled]
Shown as: clickable breadcrumb steps at top of detail page
```

### Form Tabs Pattern

Detail pages use tabs:

```
Tab 1: Main info / lines
Tab 2: Other Info (dates, references, notes)
Tab 3: Accounting (journal entry, payment info)
Tab 4: Log / History (chatter)
```

---

## CYCLE 1 — Auth + Users + Branches + Roles ✅ DONE

---

## CYCLE 2 — Products + Partners + Settings

### 2A. Products

**API Endpoints**

```
GET    /products              list (filter: type, category, canBeSold, canBePurchased, branch)
POST   /products              create
GET    /products/:id          single
PUT    /products/:id          update (requires version)
DELETE /products/:id          soft delete
GET    /products/:id/stock    stock levels per location for this product
```

**List Page** — `ProductListPage`

```
Columns:
  Image (thumbnail 40x40)
  Name (nameEn + nameAr below in smaller text)
  Reference (internal code)
  Type badge (Storable | Consumable | Service)
  Category
  Sale Price
  Cost Price
  VAT %
  On Hand (qty_on_hand — only for storable)
  Status toggle (active)

Filters bar:
  Search (name, reference)
  Type selector (All | Storable | Consumable | Service)
  Category dropdown
  Can Be Sold toggle
  Can Be Purchased toggle

Actions:
  "New" → opens Fast Create modal
  Row click → goes to detail page
  Bulk: Archive, Export
```

**Fast Create Modal** — `ProductQuickCreateModal`

```
Fields (minimum to create):
  Name (current UI lang — saved to both nameEn + nameAr)
  Type (select: Storable | Consumable | Service)
  Sale Price (number)
  Cost Price (number)
  Category (select with search)
  VAT (select from taxes list)

On save → redirect to detail page
```

**Detail Page** — `ProductDetailPage`

```
Header:
  Product image (upload)
  nameEn field
  nameAr field
  Internal Reference
  Barcode
  Active toggle
  Tags (multi-select)

Tab 1 — General Info:
  Can Be Sold checkbox → shows Sale Price, Sales Description
  Can Be Purchased checkbox → shows Cost Price, Purchase Description
  Product Type (Storable | Consumable | Service)
  Unit of Measure
  Purchase UoM

Tab 2 — Sales:
  Sales Price
  Customer Taxes (multi-select)
  Pricelist (override per product)
  Sales Description (textarea)

Tab 3 — Purchase:
  Cost Price
  Vendor Taxes (multi-select)
  Reordering Rules section:
    Table: Min Qty | Max Qty | Lead Time | Preferred Supplier
    "Add Rule" inline

Tab 4 — Inventory (storable only):
  Costing Method (Standard | AVCO | FIFO)
  Stock Valuation Account
  Income Account
  Expense Account (COGS)
  Table: Current Stock per Location
    Columns: Branch | Location | On Hand | Reserved | Available

Tab 5 — Suppliers:
  Table: Vendor | Min Qty | Price | Lead Time | Sequence
  "Add Supplier" inline row

Tab 6 — Variants (future placeholder — show "Coming Soon")
```

---

### 2B. Product Categories

**API Endpoints**

```
GET    /product-categories     list (tree structure)
POST   /product-categories     create
PUT    /product-categories/:id update
DELETE /product-categories/:id soft delete
```

**List Page** — tree table (parent → children), columns: Name (En+Ar), Parent, Products Count
**Fast Create Modal** — Name (En+Ar), Parent Category (optional)
**Detail Page** — Name (En+Ar), Parent, Accounts (Income, COGS, Inventory)

---

### 2C. Units of Measure

**API Endpoints**: standard CRUD `/units-of-measure`

**List Page** — columns: Name (En+Ar), Category, Type (Reference | Bigger | Smaller), Ratio
**Fast Create Modal** — Name En, Name Ar, Category, Type, Ratio
**No Detail Page** — inline edit in list table (Odoo pattern for simple masters)

---

### 2D. Partners (Customers + Suppliers)

**API Endpoints**

```
GET    /partners               list (filter: type, country, active)
POST   /partners               create
GET    /partners/:id           single
PUT    /partners/:id           update
DELETE /partners/:id           soft delete
GET    /partners/:id/statement AR/AP statement (invoices + payments)
GET    /partners/:id/aged      aged receivable or payable breakdown
```

**List Page** — `PartnerListPage`

```
Columns:
  Avatar / Initials
  Name (En + Ar)
  Type badges (Customer | Supplier | Both)
  Phone
  Email
  City
  Outstanding Balance (AR or AP)
  Credit Limit (customers only)
  Status toggle

Filters bar:
  Search (name, phone, email, tax number)
  Type (All | Customer | Supplier | Both | Individual)
  Active toggle

Actions:
  "New" button → Fast Create modal
  Row click → detail page
  Quick action per row: View Statement
```

**Fast Create Modal** — `PartnerQuickCreateModal`

```
Fields:
  Type (Customer | Supplier | Both | Individual)
  Name (current lang → both fields)
  Phone
  Email
  Tax Number (optional)

On save → stay on list (unlike products, partners don't need immediate detail)
Footer option: "Save & Open" → goes to detail
```

**Detail Page** — `PartnerDetailPage`

```
Header:
  Avatar upload
  nameEn
  nameAr
  Type badges (multi-select: Customer | Supplier)
  Active toggle

Tab 1 — Contact Info:
  Phone, Mobile, Email, Website
  Address (Street, City, State, Country, ZIP)
  Tax Number / VAT Number
  Notes

Tab 2 — Sales & Purchase:
  Customer section (visible if isCustomer):
    Sales Pricelist
    Payment Terms (receivable)
    Credit Limit (number)
    Credit Limit Block toggle (override company setting)
    Sales Representative (employee)
  Supplier section (visible if isSupplier):
    Payment Terms (payable)
    Currency preference

Tab 3 — Accounting:
  Receivable Account (AR) — override
  Payable Account (AP) — override
  Outstanding AR balance (read-only)
  Outstanding AP balance (read-only)
  "View Statement" button → opens Statement drawer

Tab 4 — Contacts (child contacts):
  Table: Name | Phone | Email | Position | Type
  Add inline

Tab 5 — Documents:
  File uploads (invoices, contracts, IDs)

Tab 6 — History (Chatter):
  Timeline of all transactions (invoices, payments, orders)
  Internal notes input
```

---

### 2E. Pricelists

**API Endpoints**

```
GET    /pricelists             list
POST   /pricelists             create
GET    /pricelists/:id         single with items
PUT    /pricelists/:id         update
DELETE /pricelists/:id         soft delete
```

**List Page** — Name (En+Ar), Currency, Items Count, Start Date, End Date
**Fast Create Modal** — Name (En+Ar), Currency, Discount Policy (Include in Price | Discount on Sale)
**Detail Page**:

```
Header: Name En, Name Ar, Currency, Discount Policy, Dates
Tab 1 — Rules (pricelist_items):
  Table inline editable:
    Apply On (All Products | Product Category | Product)
    Product / Category selector
    Min Quantity
    Price Computation (Fixed | Percentage Discount | Formula)
    Price / Discount %
    Date Start / End
  "Add a line" button
```

---

### 2F. Taxes

**API Endpoints**: CRUD `/taxes`

**List Page** — Name (En+Ar), Type (%), Scope (Sale|Purchase|Both), Amount, Include in Price toggle
**Fast Create Modal** — Name En, Name Ar, Type (Percentage|Fixed), Amount, Scope, Include in Price
**Detail Page**: All fields + Account Distribution table (tax account for debit/credit lines)

---

### 2G. Payment Terms

**API Endpoints**: CRUD `/payment-terms`

**List Page** — Name (En+Ar), Lines count, Note
**Fast Create Modal** — Name En, Name Ar
**Detail Page**:

```
Name En, Name Ar, Note
Payment Terms Lines (inline table):
  Type (Percent | Fixed | Balance)
  Value (%)
  Days
  Day of Month (optional)
  "Add a line" button
Preview: "Based on 1000 EGP invoice on Jan 1:" → shows computed schedule
```

---

### 2H. Settings

**No list page.** Single settings page per branch.

**API Endpoints**

```
GET    /settings/company          get company-wide settings
PUT    /settings/company          update company settings
GET    /settings/branch/:branchId get branch settings
PUT    /settings/branch/:branchId update branch settings (branch always wins)
```

**Settings Page** — `SettingsPage`

```
Sidebar navigation:
  General
  Accounting
  Inventory
  Sales
  Purchasing
  HR & Payroll

General Section:
  Company name (En + Ar)
  Logo upload
  Default language (AR | EN)
  Default currency
  Default timezone
  Fiscal year start month

Accounting Section:
  Default AR account
  Default AP account
  Default COGS account
  Default inventory account
  Tax exigibility (Invoice Basis | Cash Basis)
  Fiscal lock date (date picker)
  Tax lock date (date picker)
  Anglo-Saxon accounting toggle
  Lock posted entries toggle

Inventory Section:
  Costing method (Standard | AVCO | FIFO)
  Negative stock block toggle
  Auto-reorder toggle

Sales Section:
  Invoice policy (On Order | On Delivery)
  Credit limit block toggle
  Credit limit warning toggle

Purchasing Section:
  3-way match toggle
  3-way match tolerance %
  Bill control (On Order | On Receipt)

HR & Payroll Section:
  Work days per month (default 22)
  Work hours per day (default 8)
  Overtime rate (default 1.5)
  Late deduction enabled toggle
  Late tolerance minutes
  Social insurance employee % (default 11)
  Social insurance employer % (default 18.75)
  Income tax method (Bracket | Flat)
  EOSC enabled toggle
  EOSC base (Last Wage | Average)
  Negative leave allowed toggle
```

---

## CYCLE 3 — Accounting

### 3A. Chart of Accounts

**API Endpoints**

```
GET    /accounts               list (filter: type, group, active) — tree or flat
POST   /accounts               create
GET    /accounts/:id           single
PUT    /accounts/:id           update
DELETE /accounts/:id           soft delete (only if no journal lines exist)
GET    /accounts/:id/moves     journal lines for this account (paginated)
```

**List Page** — `ChartOfAccountsPage`

```
Display: Indented tree table (like Odoo)
Columns:
  Code
  Name (En + Ar)
  Type (Asset | Liability | Equity | Revenue | Expense)
  Normal Balance (DR | CR)
  Account Group
  Balance (Debit | Credit | Net) — computed
  Active toggle

Filters:
  Search (code, name)
  Type filter
  Group filter
  Show inactive toggle

Actions:
  "New Account" → Fast Create modal
  Row click → detail page
  Import (CSV template)
```

**Fast Create Modal**

```
Fields:
  Account Code (text)
  Name (current lang → both)
  Account Type (select)
  Parent Group (optional)
  Is Reconcilable toggle (AR/AP accounts need this)

On save → redirect to detail
```

**Detail Page**

```
Header: Code | Name En | Name Ar | Type badge | Active toggle

Tab 1 — Account:
  Account Code
  Name En
  Name Ar
  Account Type
  Account Group
  Currency (force transactions to this currency)
  Is Reconcilable (required for AR/AP)
  Deprecated toggle

Tab 2 — Journal Items:
  Table: Date | Journal | Partner | Description | Debit | Credit | Balance
  Filter by date range
  "Export" button
```

---

### 3B. Account Groups

**Simple master** — no detail page needed.
**List Page** — Code prefix, Name En, Name Ar, Accounts Count
**Fast Create Modal** — Code Prefix, Name En, Name Ar

---

### 3C. Journals

**API Endpoints**: CRUD `/journals`

**List Page** — Name (En+Ar), Type badge, Code, Default Account, Is Active
**Fast Create Modal** — Name En, Name Ar, Type, Code
**Detail Page**:

```
Tab 1 — Journal:
  Name En, Name Ar
  Type (Sales | Purchase | Cash | Bank | Miscellaneous | Payroll | Inventory)
  Short Code (e.g. BNK1)
  Currency (optional)
  Default Account
  Suspense Account (bank journals)
  Profit/Loss Account (cash journals)

Tab 2 — Advanced:
  Sequence prefix (auto-populated from type)
  Lock Posted Entries toggle (journal-level override)
  Auto-reversal toggle
```

---

### 3D. Journal Entries (Manual)

**API Endpoints**

```
GET    /journal-entries        list (filter: journal, date range, state, branch)
POST   /journal-entries        create draft
GET    /journal-entries/:id    single with lines
PUT    /journal-entries/:id    update draft (requires version)
POST   /journal-entries/:id/post       post entry (validates DR = CR)
POST   /journal-entries/:id/reset      reset to draft
POST   /journal-entries/:id/reverse    create reversal entry
DELETE /journal-entries/:id   soft delete draft only
```

**List Page** — `JournalEntriesPage`

```
Columns:
  Sequence (e.g. MISC/CAI/2024/0001)
  Date
  Journal (badge)
  Reference / Memo
  Partner
  Total Debit
  Total Credit
  Status badge (Draft | Posted | Cancelled)

Filters:
  Date range
  Journal (multi-select)
  Status
  Partner
  Search (reference, memo)

Actions:
  "New Entry" → opens detail page directly (no modal — entries are complex)
  Bulk Post (drafts only)
  Export
```

**Fast Create** — N/A for journal entries. "New" goes directly to detail.

**Detail Page** — `JournalEntryDetailPage`

```
Status bar: Draft → Posted → (Cancelled via Reversal)

Header:
  Journal (select)
  Date (date picker)
  Reference / Memo
  Sequence (auto-generated on post)
  Branch (read-only from middleware)

Journal Lines Tab (main):
  Inline editable table:
    Account (searchable select)
    Partner (searchable — required for AR/AP accounts)
    Label / Description
    Debit (number)
    Credit (number)
    Analytic / Branch (future)
  "Add a line" button
  Footer row: Total Debit | Total Credit | Difference (shown in red if ≠ 0)

Other Info Tab:
  Auto-reverse toggle → Reverse Date
  Narration (textarea)

Action Buttons (top right):
  Draft state:   [Post] [Discard]
  Posted state:  [Create Reversal] [Print]
  Cancelled:     (read-only view)

Validation on Post:
  Total Debit = Total Credit (hard block)
  Date not in locked period
  Date not before fiscal_lock_date
  Receivable/Payable lines have partner_id
```

---

### 3E. Invoices & Credit Notes (Customer)

**API Endpoints**

```
GET    /invoices               list (filter: type, partner, status, date, branch)
POST   /invoices               create draft
GET    /invoices/:id           single
PUT    /invoices/:id           update draft
POST   /invoices/:id/post      post invoice → creates AR journal entry
POST   /invoices/:id/reset     reset to draft
POST   /invoices/:id/reverse   create credit note (reversal)
POST   /invoices/:id/register-payment   register payment directly
DELETE /invoices/:id           soft delete draft only
```

**List Page** — `InvoicesListPage`

```
Tabs at top: Invoices | Credit Notes (filter by type)

Columns:
  Number (e.g. INV/CAI/2024/0001)
  Invoice Date
  Due Date
  Customer (partner)
  Sale Order ref (link)
  Amount (EGP)
  Amount Due (residual)
  Status badge (Draft | Posted | Partial | Paid | Cancelled)
  Payment Status indicator (green / orange / red dot)

Filters:
  Search (number, customer, reference)
  Status multi-select
  Date range (invoice date)
  Due date range
  Customer

Actions:
  "New Invoice" → Fast Create modal
  Bulk: Post, Send by Email, Export
  Overdue filter shortcut
```

**Fast Create Modal** — `InvoiceQuickCreateModal`

```
Fields:
  Customer (partner search)
  Invoice Date (defaults to today)
  Payment Terms (auto-fills from partner)
  One product line: Product | Quantity | Price

On save → redirect to detail page
```

**Detail Page** — `InvoiceDetailPage`

```
Status bar: Draft → Posted → (Partial) → Paid → Cancelled

Header:
  Customer (partner — locked once posted)
  Invoice Date
  Due Date (computed from payment terms, or manual)
  Payment Terms
  Delivery Address
  Reference / PO Number (customer's ref)
  Salesperson
  Sequence number (INV/CAI/2024/0001 — assigned on post)

Invoice Lines Tab:
  Inline editable table:
    Product (searchable select)
    Description
    Quantity
    Unit of Measure
    Unit Price
    Discount %
    Taxes (multi-select auto-filled from product)
    Subtotal (computed)
  "Add a line" button
  "Add a section" / "Add a note" (Odoo pattern)
  Footer:
    Untaxed Amount
    Taxes (grouped by tax)
    Total
    Amount Due

Other Info Tab:
  Journal (default: SINV)
  Fiscal Position
  Incoterms
  Source Document (PO or SO reference)
  Bank Account (for payment instructions)
  Notes (internal, not printed)

Journal Items Tab (read-only once posted):
  Shows generated journal entry lines
  Debit | Credit | Account | Partner

Payments Tab (once posted):
  Table: Date | Journal | Amount | Reference
  "Register Payment" button → opens Payment modal
  Reconciled entries shown with ✓

Action Buttons:
  Draft:   [Confirm/Post] [Discard]
  Posted:  [Register Payment] [Send & Print] [Credit Note] [Reset to Draft]
  Paid:    [Print] [Credit Note]

Register Payment Modal (inline):
  Journal (Bank | Cash)
  Payment Date
  Amount (pre-filled with amount_due)
  Memo
  [Validate Payment]
```

---

### 3F. Vendor Bills & Refunds

Same structure as Invoices but:

```
- Vendor (supplier) instead of Customer
- Type = PINV (bill) | PREF (refund)
- "Register Payment" → AP reconciliation
- Sequence: BILL/CAI/2024/0001
- Tab labels: "Vendor Bills" | "Vendor Refunds"
- 3-way match validation on post (if setting enabled)
```

**API Endpoints**

```
GET    /bills            list
POST   /bills            create
GET    /bills/:id        single
PUT    /bills/:id        update
POST   /bills/:id/post
POST   /bills/:id/reset
POST   /bills/:id/reverse
POST   /bills/:id/register-payment
```

---

### 3G. Payments (standalone)

**API Endpoints**

```
GET    /payments         list (filter: type, partner, journal, status, date)
POST   /payments         create
GET    /payments/:id     single
POST   /payments/:id/post
POST   /payments/:id/reset
POST   /payments/:id/cancel
```

**List Page** — `PaymentsListPage`

```
Tabs: Customer Payments | Vendor Payments

Columns:
  Date | Partner | Journal | Amount | Currency | Status | Matched Invoices

Filters:
  Date range, Journal, Status, Partner

Actions: "New Payment" → Fast Create
```

**Fast Create Modal**

```
Fields:
  Payment Type (Receive | Send)
  Partner
  Journal (Bank | Cash)
  Amount
  Date
  Memo / Reference
  Invoice to match (optional — searchable)
```

**Detail Page**:

```
Header: Payment Type | Partner | Date | Sequence

Tab 1:
  All fast-create fields + additional ones
  Journal Entry (read-only once posted)

Tab 2 — Matched Invoices:
  Table of reconciled invoice lines
  "Unmatch" per line (only draft)
```

---

### 3H. Reconciliation Page

**Dedicated page** (not a modal): `ReconciliationPage`

```
Two-panel layout:
  Left: Unmatched payments for a partner
  Right: Unmatched invoice lines for same partner
  Partner selector at top
  "Auto-Match" button
  Manual drag-and-drop matching
  "Reconcile" button (validates the match)
```

---

## CYCLE 4 — Inventory

### 4A. Warehouses

**API Endpoints**: CRUD `/warehouses` (branch-scoped)

**List Page** — Name (En+Ar), Branch, Short Name, Locations Count
**Fast Create Modal** — Name En, Name Ar, Branch, Short Name (e.g. WH)
**Detail Page**:

```
Tab 1: Name En, Name Ar, Short Name, Branch, Address
Tab 2 — Locations:
  Auto-generated locations: Stock, Input, Output, Quality Control, Packing, Dispatch
  Tree view of all child locations
```

---

### 4B. Locations

**API Endpoints**

```
GET    /locations         list (tree, filter: type, warehouse, active)
POST   /locations         create
GET    /locations/:id     single
PUT    /locations/:id     update
DELETE /locations/:id     soft delete (only if no stock)
```

**List Page** — Tree table: Name (En+Ar), Type badge, Parent, Is Scrap, Is Return, Active
**Fast Create Modal** — Name En, Name Ar, Parent Location, Type
**Detail Page**: Full config including accounts for inventory valuation

---

### 4C. Inventory Adjustments

**API Endpoints**

```
GET    /inventory-adjustments            list
POST   /inventory-adjustments            create (opens adjustment)
GET    /inventory-adjustments/:id        single with lines
PUT    /inventory-adjustments/:id        update lines (only open state)
POST   /inventory-adjustments/:id/validate   validate → creates stock moves
POST   /inventory-adjustments/:id/cancel
```

**List Page**

```
Columns: Reference | Date | Location | Status | Product Count | Validated By
Actions: "New Adjustment" → Fast Create
```

**Fast Create Modal**

```
Fields:
  Location (select — defaults to WH/Stock)
  Reference (optional)
  Date (defaults to today)
  Products (choose: All Products | Selected Products | One Product)
On save → goes to detail page
```

**Detail Page** — `InventoryAdjustmentDetailPage`

```
Status bar: Draft (In Progress) → Validated → Cancelled

Header: Reference | Location | Date | Responsible

Lines Tab:
  Table (editable until validated):
    Product
    Lot/Serial (if tracking)
    Location (sub-location)
    On Hand (current qty_on_hand — read-only)
    Counted Quantity (user enters this)
    Difference (= Counted - On Hand — auto computed, red if negative)
    Cost
    Valuation Impact
  "Add a line" button (if selected products mode)

Validate:
  Creates stock moves:
    Positive diff → virtual/adjustment → location
    Negative diff → location → virtual/adjustment
  Creates accounting entry (if inventory valuation enabled)
```

---

### 4D. Stock Moves (read-only log)

**API Endpoints**

```
GET    /stock-moves       list (filter: product, location, date, type, status)
GET    /stock-moves/:id   single
```

**List Page** — no create. Read-only audit log.

```
Columns: Date | Reference | Product | From | To | Qty | UoM | State | Origin Document
Filters: Product, Location, Date range, State, Type
"Export" button
```

---

### 4E. Stock Quants (Current Stock)

**API Endpoints**

```
GET    /stock-quants      list (filter: product, location, branch)
```

**List Page** — read-only dashboard view.

```
Columns: Product | Location | Lot | On Hand | Reserved | Available | Avg Cost | Value
Filters: Product, Location, Branch
Export button
"Adjust" quick button → opens Inventory Adjustment for that product
```

---

### 4F. Reorder Rules

**API Endpoints**: CRUD `/reorder-rules` (branch-scoped)

**List Page**

```
Columns: Product | Location | Min Qty | Max Qty | On Hand | Lead Time | Vendor
Filters: Product, Location, Active
Actions: "New Rule" → Fast Create | "Run Reorder" button (triggers all eligible rules)
```

**Fast Create Modal**

```
Fields:
  Product
  Location (defaults to WH/Stock)
  Min Quantity (reorder point)
  Max Quantity (order up to)
  Preferred Vendor
  Lead Time Days
```

**No detail page** — inline editing in list.

---

### 4G. Inter-Branch Transfers

**API Endpoints**

```
GET    /transfers             list
POST   /transfers             create
GET    /transfers/:id         single
PUT    /transfers/:id         update
POST   /transfers/:id/validate
POST   /transfers/:id/cancel
```

**List Page**

```
Columns: Reference | Date | From Branch | To Branch | Status | Products Count
Actions: "New Transfer" → Fast Create
```

**Fast Create Modal**

```
Fields:
  From Branch / Location
  To Branch / Location (resolves transit)
  Scheduled Date
  Note
On save → goes to detail
```

**Detail Page**:

```
Status bar: Draft → Ready → In Transit → Done → Cancelled

Header: Reference | From | To | Scheduled Date | Done Date

Lines Tab:
  Table: Product | Qty Requested | Qty Done | UoM | Lot
  "Add line" button

Stock Move Flow:
  From Branch Stock → Transit (on validate at source)
  Transit → To Branch Stock (on validate at destination)
Note: No accounting entry (same company)
```

---

## CYCLE 5 — Sales + Invoicing

### 5A. Sale Orders

**API Endpoints**

```
GET    /sale-orders                list (filter: status, partner, date, branch)
POST   /sale-orders                create
GET    /sale-orders/:id            single
PUT    /sale-orders/:id            update (draft only)
POST   /sale-orders/:id/confirm    confirm → reserve stock + create delivery
POST   /sale-orders/:id/cancel     cancel → release stock
POST   /sale-orders/:id/invoice    create invoice from SO
GET    /sale-orders/:id/deliveries list linked deliveries
DELETE /sale-orders/:id            soft delete (draft only)
```

**List Page** — `SaleOrdersListPage`

```
Columns:
  Reference (SO/CAI/2024/0001)
  Date
  Customer
  Salesperson
  Amount (total)
  Invoice Status badge (Nothing | To Invoice | Invoiced)
  Delivery Status badge (Pending | Partial | Done)
  Status badge (Draft | Confirmed | Done | Cancelled)

Filters:
  Search (ref, customer, product)
  Status
  Invoice Status
  Salesperson
  Date range

Actions:
  "New" → Fast Create modal
  Bulk: Confirm, Print, Export
```

**Fast Create Modal** — `SOQuickCreateModal`

```
Fields:
  Customer (partner search — type=customer or both)
  Pricelist (auto-fill from partner)
  Salesperson (defaults to logged-in user)
  One product line: Product | Qty | Price

On save → redirect to detail page
```

**Detail Page** — `SaleOrderDetailPage`

```
Status bar: Quotation (Draft) → Sales Order (Confirmed) → Done → Cancelled

Header:
  Customer (locked once confirmed)
  Pricelist
  Payment Terms (from partner default)
  Salesperson
  Reference
  Date (created date)
  Expiry Date (for quotation)

Order Lines Tab:
  Inline editable table (locked once confirmed):
    Product
    Description
    Quantity
    Unit
    Unit Price (auto-fill from pricelist resolution)
    Discount %
    Taxes
    Subtotal
    Qty Delivered (read-only, updates as deliveries validated)
    Qty Invoiced (read-only)
    Invoicing Status per line
  "Add a line" button
  Footer: Untaxed | Taxes | Total
  Credit limit warning banner (if applicable)

Other Info Tab:
  Delivery address
  Incoterms
  Notes (printed on order)
  Internal notes (not printed)

Delivery Tab:
  Linked deliveries table: Ref | Scheduled Date | Status | Done By
  "Validate" button on each delivery

Invoices Tab:
  Linked invoices table: Number | Date | Amount | Status
  "Create Invoice" button (visible when invoice_status = to_invoice)

Action Buttons (top right):
  Draft:     [Confirm Order] [Cancel] [Preview]
  Confirmed: [Create Invoice] [Create Delivery] [Cancel]
  Done:      [Create Invoice] [Print]
  Cancelled: (read-only)

On Confirm:
  ✓ Credit limit check
  ✓ Stock reservation
  ✓ Delivery order created automatically
  ✓ Sequence assigned
```

---

### 5B. Deliveries (Outgoing Shipments)

**API Endpoints**

```
GET    /deliveries         list (filter: status, partner, date, branch)
GET    /deliveries/:id     single
PUT    /deliveries/:id     update (draft — enter done qty)
POST   /deliveries/:id/validate   validate delivery
POST   /deliveries/:id/cancel     cancel
POST   /deliveries/:id/backorder  create backorder for remaining qty
```

**List Page**

```
Columns: Reference | Date | Customer | Origin (SO ref) | Status | Responsible
Actions: Row click → detail (no create — always created from SO)
```

**Detail Page** — `DeliveryDetailPage`

```
Status bar: Ready → Done → Cancelled

Header: Reference | Customer | Scheduled Date | Origin SO | Responsible

Lines Tab:
  Table:
    Product
    Description
    Demand (from SO)
    Done (user enters actual qty picked)
    UoM
    Lot/Serial (if tracked)
    Location (source)
  "Fill to Demand" button (sets Done = Demand for all lines)

On Validate:
  ✓ Check negative_stock_block setting
  ✓ Create stock_moves with status=done
  ✓ Update stock_quants
  ✓ Create COGS journal entry (Anglo-Saxon)
  ✓ Update sale_order_lines.qty_delivered
  ✓ If partial → prompt for Backorder
```

---

## CYCLE 6 — Purchasing

### 6A. Purchase Orders (RFQ + PO)

**API Endpoints**

```
GET    /purchase-orders                list (filter: status, vendor, date, branch)
POST   /purchase-orders                create (as RFQ)
GET    /purchase-orders/:id            single
PUT    /purchase-orders/:id            update (draft only)
POST   /purchase-orders/:id/confirm    confirm → create receipt
POST   /purchase-orders/:id/cancel
POST   /purchase-orders/:id/bill       create vendor bill from PO
GET    /purchase-orders/:id/receipts   list linked receipts
```

**List Page** — `PurchaseOrdersListPage`

```
Tabs: Requests for Quotation | Purchase Orders (filter by status)

Columns:
  Reference (PO/CAI/2024/0001)
  Date
  Vendor
  Buyer (purchaser)
  Scheduled Date
  Amount
  Invoice Status (Nothing | To Bill | Billed)
  Receipt Status (Nothing | Partial | Received)
  Status (Draft | Confirmed | Done | Cancelled)
```

**Fast Create Modal**

```
Fields:
  Vendor (partner search — type=supplier or both)
  Currency
  Order Date (today)
  Scheduled Arrival Date
  One product line: Product | Qty | Unit Price

On save → redirect to detail page
```

**Detail Page** — `PurchaseOrderDetailPage`

```
Status bar: RFQ (Draft) → Purchase Order (Confirmed) → Done → Cancelled

Header:
  Vendor (locked once confirmed)
  Currency
  Order Date
  Scheduled Date
  Payment Terms (from vendor)
  Reference / Vendor Reference

Order Lines Tab (same pattern as SO):
  Product | Description | Qty | UoM | Unit Price | Taxes | Subtotal
  Qty Received (read-only)
  Qty Billed (read-only)
  "Add a line" button
  Footer: Untaxed | Tax | Total

Receipts Tab:
  Linked receipts table
  "Receive" button on each

Bills Tab:
  Linked bills
  "Create Bill" button

On Confirm:
  ✓ Sequence assigned
  ✓ Incoming shipment created
```

---

### 6B. Receipts (Incoming Shipments)

Mirror of Deliveries but incoming.

**API Endpoints**

```
GET    /receipts           list
GET    /receipts/:id       single
PUT    /receipts/:id       update done qty
POST   /receipts/:id/validate
POST   /receipts/:id/cancel
POST   /receipts/:id/backorder
```

**Detail Page** — same pattern as Delivery but:

```
Source location = Supplier (virtual)
Destination = WH/Stock

On Validate:
  ✓ Create stock_moves
  ✓ Update stock_quants
  ✓ Recalculate AVCO avg_cost
  ✓ Create inventory valuation entry (DR Stock Input / CR AP)
  ✓ Update PO lines qty_received
  ✓ If 3-way match enabled → flag if qty mismatch
```

---

## CYCLE 7 — HR

### 7A. Employees

**API Endpoints**

```
GET    /employees              list (filter: branch, department, job, status)
POST   /employees              create
GET    /employees/:id          single
PUT    /employees/:id          update
DELETE /employees/:id          soft delete
GET    /employees/:id/contracts   list contracts
GET    /employees/:id/payslips    list payslips
GET    /employees/:id/leaves      leave balance + history
GET    /employees/:id/attendance  attendance log
```

**List Page**

```
Columns: Photo | Name (En+Ar) | Job Position | Department | Branch | Status (Active toggle)
Filters: Branch, Department, Job Position, Active
Actions: "New Employee" → Fast Create
```

**Fast Create Modal**

```
Fields:
  Name En, Name Ar
  Job Position
  Department
  Branch
  Mobile Phone
  Work Email

On save → redirect to detail
```

**Detail Page** — `EmployeeDetailPage`

```
Header:
  Photo upload
  Name En, Name Ar
  Job Position
  Department
  Manager (employee lookup)
  Branch
  Active toggle

Tab 1 — Work Information:
  Work Location
  Work Email
  Work Phone
  Mobile
  Timezone
  Working Hours schedule

Tab 2 — Private Info:
  National ID
  Birth Date
  Gender
  Marital Status
  Home Address
  Emergency Contact Name + Phone
  Bank Account (for salary transfer)

Tab 3 — HR Settings:
  Employee Code
  Linked System User (user lookup — optional)
  PIN (for POS/Attendance kiosk)

Tab 4 — Contracts:
  Active contract highlighted
  Table: Period | Wage | Structure | Status
  "New Contract" button → opens contract form

Tab 5 — Leaves:
  Leave Balance table: Type | Allocated | Used | Remaining
  Leave History table: Type | From | To | Days | Status

Tab 6 — Attendance:
  Table: Date | Check In | Check Out | Worked Hours | Overtime | Status
  Date range filter

Tab 7 — Payslips:
  Table: Period | Gross | Deductions | Net | Status
  Link to each payslip
```

---

### 7B. Contracts

**API Endpoints**

```
GET    /contracts              list (filter: employee, status, branch)
POST   /contracts              create
GET    /contracts/:id          single
PUT    /contracts/:id          update (draft/active only)
POST   /contracts/:id/activate
POST   /contracts/:id/expire
POST   /contracts/:id/cancel
```

**List Page** — Employee | Period (From–To) | Wage | Structure | Status badge
**Fast Create** — accessed from Employee detail Tab 4

**Detail Page** — `ContractDetailPage`

```
Status bar: Draft → Active → Expired → Cancelled

Header:
  Employee (locked once active)
  Contract Reference
  Start Date, End Date (optional — open-ended)
  Department, Job Position

Tab 1 — Contract Details:
  Salary Structure
  Wage (monthly / daily / hourly)
  Wage Type (Monthly | Daily | Hourly)
  Working Schedule
  Notes

Tab 2 — Payslip History:
  Table of all payslips generated on this contract
```

---

### 7C. Leave Types

**API Endpoints**: CRUD `/leave-types`

**List Page** — Name (En+Ar), Allocation Mode, Leave Validation, Color, Requires Approval toggle
**Fast Create Modal** — Name En, Name Ar, Color, Requires Approval
**Detail Page**: All fields + Allocation rules + Time-off policy

---

### 7D. Leave Requests

**API Endpoints**

```
GET    /leaves                 list (filter: employee, type, status, date, branch)
POST   /leaves                 create
GET    /leaves/:id             single
PUT    /leaves/:id             update (draft only)
POST   /leaves/:id/confirm     employee submits
POST   /leaves/:id/approve     manager approves
POST   /leaves/:id/refuse      manager refuses
POST   /leaves/:id/reset       reset to draft
```

**List Page**

```
Views: My Team's Leaves (manager) | My Leaves | All Leaves (HR)
Columns: Employee | Leave Type | From | To | Days | Half Day | Status | Approved By
Filters: Status, Leave Type, Employee, Date range

Calendar View toggle (shows leave as colored blocks on calendar — per Odoo)
```

**Fast Create Modal**

```
Fields:
  Employee (defaults to self — HR can change)
  Leave Type
  From Date
  To Date
  Is Half Day toggle → Time (Morning | Afternoon)
  Description / Reason

Validation:
  Available balance shown live below leave type selection
  Block if balance = 0 (when negative_leave_allowed = false)
```

**Detail Page** — `LeaveRequestDetailPage`

```
Status bar: Draft → Confirmed → Approved / Refused

Header: Employee | Leave Type | Period | Days

All fields + Approval info (approved by, approved date)
Balance impact line: "This will use X days. Remaining: Y days"
```

---

### 7E. Leave Allocations

**API Endpoints**

```
GET    /leave-allocations      list
POST   /leave-allocations      create
GET    /leave-allocations/:id  single
POST   /leave-allocations/:id/approve
POST   /leave-allocations/:id/refuse
```

**List Page** — Employee | Leave Type | Year | Number of Days | Mode | Status
**Fast Create Modal** — Employee (or All Employees), Leave Type, Days, Year, Mode (Manual|Accrual)
**No detail page** — inline in list.

---

### 7F. Attendance

**API Endpoints**

```
GET    /attendance             list (filter: employee, date, branch)
POST   /attendance             create (manual entry)
PUT    /attendance/:id         update
DELETE /attendance/:id         delete
POST   /attendance/check-in    kiosk check-in (by employee pin or ID)
POST   /attendance/check-out   kiosk check-out
```

**List Page**

```
Columns: Employee | Date | Check In | Check Out | Worked Hours | Overtime | Late Minutes | Status
Filters: Employee, Date range, Branch
Actions:
  "New Entry" → Fast Create (manual correction)
  "Import" (bulk CSV import)
  Export
```

**Fast Create Modal** — Employee, Date, Check In Time, Check Out Time, Note

---

## CYCLE 8 — Payroll

### 8A. Salary Structures

**API Endpoints**: CRUD `/salary-structures`

**List Page** — Name (En+Ar), Type (Employee | Worker | Hourly), Rules Count
**Fast Create** — Name En, Name Ar, Type
**Detail Page**:

```
Tab 1: Name En, Name Ar, Type, Parent Structure
Tab 2 — Rules (salary_rules, ordered by sequence):
  Inline editable table:
    Sequence | Code | Name En | Name Ar | Category | Condition | Computation | Amount | Appears on Payslip
  Drag to reorder (sequence)
  "Add Rule" button
```

---

### 8B. Salary Rules

**No standalone list** — managed inside Salary Structure detail.
Can be linked/reused across structures.

---

### 8C. Payslips

**API Endpoints**

```
GET    /payslips               list (filter: employee, period, status, branch)
POST   /payslips               create single
POST   /payslips/generate-batch  generate for all employees in a branch/department
GET    /payslips/:id           single with lines
PUT    /payslips/:id           update (draft only — correction)
POST   /payslips/:id/compute   recompute all lines
POST   /payslips/:id/confirm   confirm → create journal entry
POST   /payslips/:id/reset     reset to draft
POST   /payslips/:id/cancel    cancel (only via reversal entry)
```

**List Page** — `PayslipsListPage`

```
Columns: Employee | Period | Structure | Gross | Deductions | Net | Status badge
Filters: Period (month/year), Department, Branch, Status, Employee

Actions:
  "New Payslip" → Fast Create
  "Generate Batch" button → opens batch generation modal (all employees, one period)
  Bulk: Confirm, Print
```

**Fast Create Modal** (single employee)

```
Fields:
  Employee
  Salary Structure (auto-filled from contract)
  Date From
  Date To
  Reference

On save → opens detail page and auto-computes
```

**Batch Generation Modal**

```
Fields:
  Period (Month + Year)
  Branch / Department (filter)
  Structure (optional override)

[Generate] → creates draft payslip for every active employee with active contract
```

**Detail Page** — `PayslipDetailPage`

```
Status bar: Draft → Confirmed → Cancelled

Header:
  Employee (with photo)
  Contract (read-only link)
  Structure
  Period From → To
  Reference

Payslip Lines Tab:
  Read-only table (populated after compute):
    Category | Code | Name | Quantity | Rate | Amount
  Rules shown in sequence order
  Footer: Gross | Deductions | Net

Work Summary Tab:
  Worked Days: Payable Days | Leave Days | Absent Days | Overtime Hours
  Input lines (manual overrides: advance deduction, bonus, etc.)

Accounting Tab:
  Journal Entry reference (once confirmed)
  Journal lines (DR Salary Expense | CR SI Payable | CR Tax Payable | CR Salary Payable)

Action Buttons:
  Draft:     [Compute Sheet] [Confirm] [Discard]
  Confirmed: [Print Payslip] [Create PDF]
  Cancelled: read-only

Computation Rule (auto on confirm):
  Standard Egyptian rules (BASIC, HRA, TRANS, GROSS, SI_EMP, TAX, LATE, ADV, NET)
  SI = GROSS * 11% (employee) + GROSS * 18.75% (employer — not deducted, shown separately)
  Tax = progressive bracket (or flat from settings)
  NET = GROSS - SI_EMP - TAX - LATE - ADV
```

---

### 8D. Payroll Journal Entries (auto-created on payslip confirm)

Shown on Payslip → Accounting tab. No separate creation needed.

---

## CYCLE 9 — CRM

### 9A. CRM Stages

**API Endpoints**: CRUD `/crm-stages`

**List Page** — Name (En+Ar), Sequence, Is Won, Probability, Leads Count
**Fast Create** — Name En, Name Ar, Probability %, Is Won toggle
**No detail page** — inline edit.

---

### 9B. CRM Leads / Opportunities

**API Endpoints**

```
GET    /crm                    list + kanban (filter: stage, type, assigned, date)
POST   /crm                    create lead
GET    /crm/:id                single
PUT    /crm/:id                update
POST   /crm/:id/convert        convert lead → opportunity
POST   /crm/:id/won            mark won → auto-create SO
POST   /crm/:id/lost           mark lost (requires reason)
DELETE /crm/:id                soft delete
```

**List Page / Kanban** — `CRMPage`

```
Default View: Kanban (Odoo default for CRM)
Toggle: List | Kanban

Kanban View:
  Columns = pipeline stages (ordered by sequence)
  Card shows:
    Title / Opportunity name
    Customer
    Expected Revenue (EGP)
    Probability % (colored bar — green/orange/red)
    Assigned to (avatar)
    Scheduled Activity indicator
  Drag card between stages → updates stage + logs activity
  "New" button in each column → inline quick add

List View columns:
  Name | Customer | Stage | Expected Revenue | Probability | Assigned | Next Activity | Close Date

Filters:
  Assigned to me
  My team
  Won / Lost toggle
  Date range
  Stage

Pipeline Summary bar (top of kanban):
  Total opportunities | Total weighted revenue
```

**Fast Create** (from Kanban "+" button)

```
Fields:
  Opportunity Name / Title
  Customer (or New company name if no existing partner)
  Phone, Email
  Expected Revenue
  Stage (defaults to column it was created in)
  Assigned To
```

**Detail Page** — `CRMLeadDetailPage`

```
Status bar: New → Qualified → Proposition → Won / Lost
(Stages from pipeline, not fixed — last stage with isWon = true triggers win action)

Header:
  Title
  Customer (partner)
  Company
  Phone, Email, Website
  Stage (select — drives kanban position)
  Probability % (auto or manual)
  Expected Revenue
  Assigned To

Tab 1 — Lead Info:
  Source (how they came in: Website | Referral | Cold Call | etc.)
  Campaign
  Medium
  Priority (1-3 stars)
  Tags
  Description / Notes (rich text)
  Next Activity

Tab 2 — Extra Info:
  Expected Close Date
  Days since creation (computed)
  Estimated Budget
  Contact name (if no partner linked)

Tab 3 — Linked Documents:
  Sale Orders (created on win)
  Proposals / Quotations linked
  Activities log

Action Buttons:
  Lead:     [Convert to Opportunity] [Mark Lost]
  Oppty:    [Won] [Lost] [New Activity]
  Won:      [View Sale Order]

On Won:
  ✓ Stage set to isWon stage
  ✓ Sale Order auto-created with partner + expected revenue
  ✓ Link SO to opportunity

Lost Modal:
  Required: Loss Reason (select or free text)
```

---

### 9C. Activities (CRM + cross-module)

**API Endpoints**

```
GET    /activities             list (filter: type, assigned, date, model, record_id)
POST   /activities             create
PUT    /activities/:id         update
POST   /activities/:id/done    mark done
DELETE /activities/:id         delete
```

**Used across CRM, Partners, Sale Orders — shown in chatter/timeline of each record**

Activity Types: Email | Call | Meeting | Task | Deadline | Upload Document

Activity widget on any record:

```
Shows: Next activity due date + type icon (color = green if future, orange if today, red if past)
Click → Activity panel: list upcoming + done activities for this record
"Schedule Activity" button → modal: Type | Summary | Due Date | Assigned To | Note
```

---

## CYCLE 10 — Reports + Dashboard

### 10A. Main Dashboard

**API Endpoints**

```
GET    /dashboard/summary      KPIs snapshot for selected branch + date range
GET    /dashboard/charts       chart data (revenue trend, top products, etc.)
```

**Dashboard Page** — `DashboardPage`

```
Top filters: Branch selector | Date Range | Compare to previous period

KPI Cards row:
  Today's Revenue | Open Invoices | Overdue AR | Cash Balance | Stock Value

Charts row 1:
  Revenue vs Expenses (line chart — monthly trend)
  Top 5 Customers by Revenue (bar chart)

Charts row 2:
  Outstanding AR by aging bucket (bar chart)
  Inventory Value by Category (donut chart)

Quick Access panels:
  Overdue Invoices (top 5 — click to open)
  Pending Deliveries (top 5)
  Leave Requests Pending Approval (top 5)
  Reorder Alerts (products below min qty)
```

---

### 10B. Profit & Loss Report

**API Endpoints**

```
GET    /reports/profit-loss    P&L for date range + branch (optional)
```

**Report Page** — `ProfitLossPage`

```
Filters: Date From | Date To | Branch (All | specific) | Compare Period toggle

Output (hierarchical, collapsible — like Odoo):
  REVENUE
    Sales Revenue         [amount]
    Other Income          [amount]
  Total Revenue                       [subtotal]

  EXPENSES
    Cost of Goods Sold    [amount]
    Salaries & Wages      [amount]
    Office Expenses       [amount]
    ...
  Total Expenses                      [subtotal]

  NET PROFIT / (LOSS)                 [total]

Drilldown: click any account → journal lines filtered by period + account
Export: PDF | Excel
```

---

### 10C. Balance Sheet

**API Endpoints**

```
GET    /reports/balance-sheet  balance sheet as of a date + branch
```

**Report Page** — `BalanceSheetPage`

```
Filter: As of Date | Branch

Output:
  ASSETS
    Current Assets
      Cash & Bank         [amount]
      Accounts Receivable [amount]
      Inventory           [amount]
    Total Current Assets
    Non-Current Assets
      Fixed Assets        [amount]
    Total Non-Current Assets
  TOTAL ASSETS                        [total]

  LIABILITIES & EQUITY
    Current Liabilities
      Accounts Payable    [amount]
      VAT Payable         [amount]
    Total Current Liabilities
    Equity
      Owner's Capital     [amount]
      Retained Earnings   [amount]
    Total Equity
  TOTAL LIABILITIES & EQUITY         [total]

  Validation line: Assets - (Liabilities + Equity) = 0 ✓ (shown in green)
```

---

### 10D. Aged Receivables & Payables

**API Endpoints**

```
GET    /reports/aged-receivables   aged AR as of date
GET    /reports/aged-payables      aged AP as of date
```

**Report Page** — `AgedReceivablesPage` / `AgedPayablesPage`

```
Filters: As of Date | Branch | Partner

Output table:
  Partner | Total | Current | 1-30 | 31-60 | 61-90 | 90+

Click partner row → full list of open invoices for that partner
Export: PDF | Excel
```

---

### 10E. General Ledger

**API Endpoints**

```
GET    /reports/general-ledger   all journal lines (filter: account, date, partner, branch)
```

**Report Page**

```
Filters: Date range | Account (multi-select) | Partner | Journal | Branch | Posted only toggle

Output grouped by account:
  Account: 1100 - Accounts Receivable
    Date | Journal | Partner | Description | Debit | Credit | Running Balance
    ...
  Opening Balance | Closing Balance per account

Export: PDF | Excel
```

---

### 10F. Trial Balance

**API Endpoints**

```
GET    /reports/trial-balance    aggregated debit/credit per account for a period
```

**Report Page**

```
Filters: Date range | Branch

Output table:
  Code | Account Name | Opening Debit | Opening Credit | Period Debit | Period Credit | Closing Debit | Closing Credit

Footer: Total row
Validation: Total Debit = Total Credit ✓
Export: PDF | Excel
```

---

### 10G. Inventory Reports

**Stock Valuation Report**

```
GET    /reports/stock-valuation   stock value per product/location/branch

Output: Product | Category | On Hand | Avg Cost | Total Value
Filter: Branch, Category, Location
Export: PDF | Excel
```

**Stock Movement Report**

```
GET    /reports/stock-movements   moves in a date range per product

Output: Product | Date | From | To | Qty | Reference | Type
Filter: Product, Date range, Move type, Branch
```

---

### 10H. Payroll Reports

**Monthly Payroll Summary**

```
GET    /reports/payroll-summary   all payslips for a period

Output: Employee | Basic | Allowances | Gross | SI | Tax | Deductions | Net
Filter: Period, Branch, Department
Total row
Export: PDF | Excel (for bank transfer file)
```

---

### 10I. Sales Reports

**Sales by Product / Customer / Salesperson**

```
GET    /reports/sales   sales aggregated by dimension

Dimensions: Product | Customer | Salesperson | Period
Filter: Date range, Branch, Salesperson

Output: Dimension | Qty | Revenue | Discount | Taxes | Net
Drill down: click row → individual SO lines
Chart: Bar chart of revenue by period (month)
```

---

## COMPONENT LIBRARY (reuse across all modules)

### Shared Components to Build Once

```
<StatusBadge status="draft|confirmed|posted|paid|done|cancelled" />
<AmountDisplay amount={} currency="EGP" />
<BranchTag branch={} />
<PartnerLink id={} name={} />
<DocumentLink model="invoice|so|po" id={} ref={} />
<PageHeader title actions breadcrumb />
<FilterBar fields onFilter />
<DataTable columns data pagination onRow />
<FastCreateModal title fields schema onSave onCancel />
<DetailLayout statusBar header tabs />
<StatusBar steps currentStep />
<InlineEditableTable columns value onChange addLabel />
<ChatterPanel recordId model />
<ActivityWidget recordId model />
<PrintButton recordId model />
<MoneyInput />   — formats as EGP, handles decimals
<DateRangePicker />
<PartnerSelect type="customer|supplier|both" />
<ProductSelect type="storable|all" />
<AccountSelect type="asset|liability|..." />
<JournalSelect type="sales|purchase|cash|bank|all" />
```

---

## FILE STRUCTURE (Frontend)

```
src/
  modules/
    products/
      pages/
        ProductListPage.tsx
        ProductDetailPage.tsx
      components/
        ProductQuickCreateModal.tsx
        ProductStockTab.tsx
      hooks/
        useProducts.ts
        useProductMutations.ts
      types/
        product.types.ts
      api/
        products.api.ts
    partners/
      (same structure)
    accounting/
      pages/
        ChartOfAccountsPage.tsx
        JournalEntriesPage.tsx
        InvoicesListPage.tsx
        InvoiceDetailPage.tsx
        BillsListPage.tsx
        PaymentsListPage.tsx
        ReconciliationPage.tsx
      ...
    inventory/
      ...
    sales/
      ...
    purchasing/
      ...
    hr/
      ...
    payroll/
      ...
    crm/
      ...
    reports/
      ...
  shared/
    components/   (all shared components above)
    hooks/
    types/
    utils/
  store/
    auth.store.ts
    branch.store.ts
    ui.store.ts
  router/
    index.tsx
    routes.ts
```

---

## FILE STRUCTURE (API — NestJS)

```
src/
  modules/
    products/
      products.module.ts
      products.controller.ts
      products.service.ts
      dto/
        create-product.dto.ts
        update-product.dto.ts
        product-filter.dto.ts
      entities/
        product.entity.ts
        product-category.entity.ts
        supplier-product.entity.ts
      products.controller.spec.ts
      products.service.spec.ts
    partners/
      (same structure)
    accounting/
      journals/
      journal-entries/
      invoices/
      bills/
      payments/
      reconciliation/
    inventory/
      warehouses/
      locations/
      stock-moves/
      stock-quants/
      reorder-rules/
      adjustments/
      transfers/
    sales/
    purchasing/
    hr/
      employees/
      contracts/
      leaves/
      leave-allocations/
      attendance/
    payroll/
      salary-structures/
      salary-rules/
      payslips/
    crm/
    reports/
  common/
    decorators/
      branch.decorator.ts
      current-user.decorator.ts
    guards/
      jwt-auth.guard.ts
      permissions.guard.ts
    interceptors/
      transform.interceptor.ts
    pipes/
      validation.pipe.ts
    middleware/
      branch.middleware.ts
```

---

## SESSION PROMPT TEMPLATE

When starting a new Claude session, paste this:

```
I'm building Tatweer (تطوير), a SaaS ERP for SMEs in Egypt.
The full spec and plan is in tatweer-plan.md (attached/above).

Today's task: Build Cycle [N] — [Module Name]

Please follow the plan exactly:
- NestJS API with TypeORM entities, DTOs, service, controller
- React frontend with list page, fast-create modal, and detail page per entity
- Follow all global rules (bilingual, branch-scoped, Odoo patterns)
- Use Ant Design 6 components only
- Start with the API, then the frontend

Start with: [specific entity or step]
```

---

## 25. Branch-Product Assignment

### Business Rule

Each branch can operate in a different field and therefore sells different products.
Products are assigned per branch via a join table.

### Data Model

```
branch_products (join table):
  id          uuid PK
  branch_id   uuid → branches (branch-scoped)
  product_id  uuid → products (company-level)
  createdAt   timestamp
  UNIQUE(branch_id, product_id)
```

### API Endpoints

```
GET  /branches/:id/products          list products assigned to this branch
PUT  /branches/:id/products          set assigned products (array of product_ids)
POST /branches/:id/products/:pid     assign single product
DELETE /branches/:id/products/:pid   unassign single product
```

### Branch Filter Rule

Every product selector across the system (Sale Orders, Purchase Orders,
Reorder Rules, Inventory Adjustments) must filter products by current branch:

SELECT products WHERE id IN (
SELECT product_id FROM branch_products WHERE branch_id = :currentBranchId
)

Company admin and backoffice users bypass this filter and see all products.

### Affected Pages

```
ProductListPage           → filtered to current branch's products
Sale Order lines          → product search filtered to branch
Purchase Order lines      → product search filtered to branch
Inventory Adjustment      → product search filtered to branch
Reorder Rules             → product search filtered to branch
Stock Quants view         → filtered to branch's products
Inventory Valuation report → filtered to branch's products
Sales by Product report   → filtered to branch's products
```

### Branch Settings — Products Tab (new tab)

```
Location: Branch detail page → new Tab: "Products"

UI: Ant Design Transfer component
  Left panel:  "All Company Products" (unassigned)
  Right panel: "Assigned to this Branch"
  Search in both panels
  [Save Assignment] button

Each product card shows:
  Name (En + Ar) | Type badge | Category
```

### What Is NOT Affected

```
Chart of Accounts    → company-level, no change
Taxes                → company-level, no change
Payment Terms        → company-level, no change
Journals             → company-level, no change
Partners             → company-level, no change
Employees            → already branch-scoped, no change
```
