# Tatweer — Cross-Module Features (Deep Dive)

> These features apply to every module. Build them once, reuse everywhere.

**Included:** Chatter, Activities, Fiscal Positions, Bank Statements, Product Variants, Down Payments, Email Templates, Print Templates
**Deferred:** Followers, Tags, Analytic Accounts, Landed Costs

---

## 1. Chatter (Messages + Log Notes)

### What It Is

Every major record has a communication thread at the bottom of its detail page.
Exactly like Odoo's chatter. Two types of entries:

- **Message** → visible to all followers, can trigger email notification
- **Log Note** → internal only, yellow background, never emailed

### Applies To

```
invoices, bills, payments, sale_orders, purchase_orders,
deliveries, receipts, partners, employees, leads,
payslips, leave_requests, expense_reports, repair_orders,
helpdesk_tickets, production_orders, maintenance_requests
```

### Storage — MongoDB

```javascript
// messages collection
{
  _id:         ObjectId,
  tenantId:    String,           // UUID
  model:       String,           // "invoice" | "sale_order" | "partner" | ...
  recordId:    String,           // UUID of the record
  type:        "message" | "log_note" | "system",
  subtype:     "discussed" | "note" | "activity_done" | "status_changed",
  authorId:    String,           // users.id
  authorName:  String,           // snapshot — don't join on read
  authorAvatar: String,          // URL snapshot
  body:        String,           // HTML (sanitized)
  attachments: [
    { name: String, url: String, size: Number, mimeType: String }
  ],
  parentId:    ObjectId | null,  // for threaded replies
  isInternal:  Boolean,          // true = log note
  createdAt:   Date,
  updatedAt:   Date,
  deletedAt:   Date | null
}
```

### API Endpoints

```
GET    /chatter/:model/:recordId/messages
       Query: { page, limit, type }
       Returns: paginated messages oldest→newest

POST   /chatter/:model/:recordId/messages
       Body: { type, body, attachments[], parentId? }
       Side effect: notify followers (if type=message)

PUT    /chatter/messages/:messageId
       Body: { body }
       Only author can edit, within 5 minutes

DELETE /chatter/messages/:messageId
       Soft delete — shows "This message was deleted"

POST   /chatter/:model/:recordId/attachments
       Multipart upload → returns { name, url, size, mimeType }
```

### System Auto-Log Events

The service layer auto-posts a `system` log note when:

```
Record created      → "Invoice INV/CAI/2024/0001 created by Ahmed Ali"
Status changed      → "Status changed from Draft to Posted"
Field changed       → "Due date changed from Jan 15 to Jan 30"  (for tracked fields)
Payment registered  → "Payment of 5,000 EGP registered"
Assignment changed  → "Assigned to Sara Ahmed"
```

### UI Component — `<ChatterPanel />`

```
Props: model, recordId, readonly?

Layout (bottom of every detail page):
┌─────────────────────────────────────────────────┐
│  [Send message ▼]  [Log note]                   │
├─────────────────────────────────────────────────┤
│  Rich text editor (basic: bold/italic/link/list)│
│  📎 Attach files                                │
│  Followers: 👤 Ahmed  👤 Sara  [+ Add]          │
│                              [Send] [Discard]   │
├─────────────────────────────────────────────────┤
│  Timeline (newest first):                       │
│                                                 │
│  👤 Ahmed Ali · 2 hours ago              ✏ 🗑  │
│  ┌─────────────────────────────────────────┐   │
│  │ Please confirm the delivery date        │   │
│  │ 📎 delivery_note.pdf                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  🔧 SYSTEM · Jan 15                            │
│  Status changed: Draft → Posted                │
│                                                 │
│  📝 Sara Ahmed · Jan 14  (Log note — yellow)   │
│  ┌─────────────────────────────────────────┐   │
│  │ Customer called, requested 30-day terms │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Notes:
  - Log notes shown with yellow left border
  - System messages shown with grey italic style
  - Attachments shown as clickable chips
  - "Load more" pagination at top of timeline
```

---

## 2. Activities

### What It Is

Scheduled to-do items on any record. Shows in list view as colored icons.
Color = Green (future) | Orange (due today) | Red (overdue).

### Activity Types

```
📞 Phone Call
✉️  Email
📅 Meeting
✅ To-Do
⏰ Deadline
📄 Upload Document
```

### Storage — PostgreSQL (needs querying + filtering)

**activities table** (already in schema Part 5)

```
id              UUID PK
tenantId        UUID → tenants
model           VARCHAR          -- "sale_order", "invoice", "partner"
recordId        UUID
recordName      VARCHAR          -- snapshot: "INV/CAI/2024/0001"
activityType    ENUM(call, email, meeting, todo, deadline, upload_document)
icon            VARCHAR          -- emoji or icon name
summary         VARCHAR          -- short title shown on kanban card
note            TEXT             -- full description
scheduledDate   DATE
assignedTo      UUID → users
isDone          BOOLEAN default false
doneAt          TIMESTAMP nullable
doneByUserId    UUID nullable → users
feedbackNote    TEXT nullable     -- filled when marking done
...TenantAwareEntity
```

### API Endpoints

```
GET    /activities
       Query: { model?, recordId?, assignedTo?, isDone?, dueBefore?, dueAfter? }
       Returns: paginated, ordered by scheduledDate ASC

GET    /activities/my             current user's activities (for "My Activities" view)
GET    /activities/overdue        overdue activities for manager dashboard

POST   /activities
       Body: { model, recordId, activityType, summary, note, scheduledDate, assignedTo }

PUT    /activities/:id
       Body: { summary?, note?, scheduledDate?, assignedTo? }

POST   /activities/:id/mark-done
       Body: { feedbackNote? }
       Side effect: auto-posts log note on the record with feedback

DELETE /activities/:id
```

### UI — Activity Indicator on List Pages

```
Every list page row shows an activity column:
  No activity    → grey clock icon
  Future         → green icon + "Call · Jan 20"
  Due today      → orange icon + "Meeting · Today"
  Overdue        → red icon + "Email · 3 days ago"

Click icon → Activity Popover:
  Shows all activities for this record
  [Mark Done] [Edit] [Schedule New]
```

### UI — Activity Panel on Detail Pages

```
Shown above the Chatter, below the tabs:

┌────────────────────────────────────────────────┐
│  Activities                    [+ Schedule]    │
├────────────────────────────────────────────────┤
│  📞 Phone Call · Due Jan 20                    │
│  "Follow up on delivery"                       │
│  Assigned to: Ahmed Ali                        │
│  [Mark Done ✓]  [Edit ✏]  [Cancel 🗑]         │
├────────────────────────────────────────────────┤
│  ✅ To-Do · Due Jan 25 (overdue — red)         │
│  "Send updated quote"                          │
│  [Mark Done ✓]  [Edit ✏]  [Cancel 🗑]         │
└────────────────────────────────────────────────┘

Mark Done → modal: "Feedback / outcome?" textarea → [Done & Schedule Next?]
```

### My Activities Page (global view)

```
Route: /activities

View toggle: List | Kanban (grouped by activity type)

Columns: Record | Type | Summary | Due Date | Assigned To | Status

Filters: Type, Due Date, Assigned To (manager can see team)

Today's activities highlighted
Overdue in red
```

---

## 3. Fiscal Positions

### What It Is

Fiscal positions automatically remap taxes and accounts based on
the customer's location or type. Critical for:

- Export customers (0% VAT instead of 14%)
- Free zone companies
- Government entities (different tax treatment)

### How It Works

```
Step 1: Partner has fiscalPositionId set (or auto-detected by country)
Step 2: When creating SO/Invoice for this partner:
         → System reads fiscal_position_taxes for this position
         → For each line tax: replace taxSrcId with taxDestId
         → If taxDestId is null → remove that tax entirely
Step 3: Also remaps accounts per fiscal_position_accounts rules
Step 4: Shows fiscal position name as info banner on document
```

### Storage — PostgreSQL

```
fiscal_positions:
  id, tenantId, nameEn, nameAr, autoDetect, country, note

fiscal_position_taxes:
  id, tenantId, fiscalPositionId
  taxSrcId    → taxes   (the original tax)
  taxDestId   → taxes   (replacement, NULL = remove)

fiscal_position_accounts:
  id, tenantId, fiscalPositionId
  accountSrcId  → chart_of_accounts
  accountDestId → chart_of_accounts
```

### Examples

```
Fiscal Position: "Export (0% VAT)"
  Tax mapping:  14% VAT → null (removed)
  Use case:     International customers

Fiscal Position: "Government Entity"
  Tax mapping:  14% VAT → 5% WHT
  Use case:     Egyptian government contracts

Fiscal Position: "Free Zone"
  Tax mapping:  14% VAT → 0% VAT
  Account mapping: Revenue 4100 → Export Revenue 4110
```

### API Endpoints

```
GET    /fiscal-positions            list
POST   /fiscal-positions            create
GET    /fiscal-positions/:id        single with tax + account mappings
PUT    /fiscal-positions/:id        update
DELETE /fiscal-positions/:id        soft delete

GET    /fiscal-positions/resolve?partnerId=&taxIds[]=
       Returns mapped taxes for a given partner + tax list
       Used by SO/Invoice line computation
```

### UI

```
List Page: Name (En+Ar) | Country | Auto-detect | Tax Rules Count

Detail Page:
  Tab 1 — General:
    Name En, Name Ar
    Auto-detect toggle
    Country (if auto-detect enabled)
    Notes

  Tab 2 — Tax Mapping:
    Inline table:
      Tax on Sale (src) | Tax to Apply (dest — empty = remove)
    "Add a line" button

  Tab 3 — Account Mapping:
    Inline table:
      Account to Map (src) | Account to Use (dest)
    "Add a line" button

On partner detail page → Tab Sales/Purchase:
  Fiscal Position selector
  Info: "Applies tax and account remapping for this partner"

On SO / Invoice detail:
  Banner below header (if fiscal position active):
  ℹ️  Fiscal Position: Export (0% VAT) — taxes have been adjusted
```

---

## 4. Bank Statements + Reconciliation

### What It Is

Import bank transactions (CSV/OFX), then match them to existing payments
and journal entries. Identifies unmatched items (missing payments).

### Full Flow

```
1. Import bank statement (CSV/OFX) OR enter lines manually
2. System auto-matches lines to existing payments by:
   - Exact amount match
   - Same partner name
   - Date proximity (±3 days)
   - Reference number match
3. User reviews: confirm auto-matches or manually assign
4. Validate → creates journal entries for unmatched lines
5. Statement balanced → closing balance = bank balance
```

### Storage

```
bank_statements:
  id, tenantId, branchId, journalId (bank type only)
  name, dateFrom, dateTo
  balanceStart, balanceEnd, balanceEndReal
  status: open | posted

bank_statement_lines:
  id, tenantId, branchId, statementId
  date, reference, partnerName, amount
  (+positive = deposit, -negative = withdrawal)
  isReconciled, journalEntryId, paymentId
```

### API Endpoints

```
GET    /bank-statements                list (filter: journal, status, date)
POST   /bank-statements                create
GET    /bank-statements/:id            single with lines
POST   /bank-statements/:id/import     import CSV/OFX file → creates lines
POST   /bank-statements/:id/auto-match auto-match all unreconciled lines
POST   /bank-statements/:id/validate   post → creates journal entries for unmatched
DELETE /bank-statements/:id            soft delete (only open)

GET    /bank-statements/:id/lines      paginated lines
POST   /bank-statements/:id/lines      add line manually
DELETE /bank-statements/lines/:lineId  delete unreconciled line

POST   /bank-statements/lines/:lineId/match
       Body: { paymentId? | journalEntryId? | createNewPayment? }
       Reconciles the line

POST   /bank-statements/lines/:lineId/unmatch
       Removes reconciliation
```

### UI — Bank Statement Page

```
Route: /accounting/bank-statements/:id

Header:
  Journal (Bank account name) | Period | Opening Balance | Closing Balance
  Difference (Expected - Actual) shown in red if ≠ 0
  Status badge | [Validate] button

Two-panel layout:

LEFT — Statement Lines:
  ┌──────────────────────────────────────────────┐
  │ Date    │ Label         │ Amount   │ Status  │
  ├──────────────────────────────────────────────┤
  │ Jan 15  │ Ahmed Trading │ +5,000   │ ✅ Match│
  │ Jan 16  │ Unknown Debit │ -1,200   │ ❓ None │
  │ Jan 17  │ Salary Trans  │ -45,000  │ 🔄 Part │
  └──────────────────────────────────────────────┘
  Click row → highlights matched entry on right

RIGHT — Matched Entries / Search:
  When line selected → shows:
    Auto-suggested matches (sorted by confidence %)
    [Match this] button per suggestion
    Or: [New Payment] [Write-Off] [Ignore]

  Matched:
    Shows the linked payment/entry
    [Unmatch] button

Import button → drag-drop CSV/OFX
  CSV format: date, reference, partnerName, amount
  OFX: standard bank export format

Auto-match progress bar when running
```

---

## 5. Product Variants

### What It Is

One product template with multiple sellable combinations.
Example: T-Shirt → Color (Red/Blue/Green) × Size (S/M/L) = 9 variants.

### Data Model

```
products (template):
  hasVariants: true
  productType: goods

product_attributes:
  nameEn/Ar: "Color", "Size", "Material"
  displayType: radio | select | color | pills

product_attribute_values:
  attributeId, nameEn/Ar: "Red", "Blue", "Small", "Large"
  htmlColor: "#FF0000" (for color type)

product_template_attributes:
  productId → attribute mapping (which attributes this product uses)

product_variants:
  productId (template)
  combinationName: "Red / Large" (computed)
  barcode, internalRef (per variant)
  priceExtra: +50 EGP for Large size
  costPrice: override

product_variant_attribute_values:
  variantId → attributeValueId (which values define this variant)
```

### Variant Generation

```
When attributes are saved on a template:
  System generates ALL combinations automatically
  Example: 3 colors × 3 sizes = 9 variants auto-created
  User can deactivate specific combinations (e.g. no Green XL)
  Each variant gets: combinationName, priceExtra = sum of value priceExtras
```

### API Endpoints

```
GET    /products/:id/variants          list all variants for a template
POST   /products/:id/generate-variants re-generate variants after attribute change
PUT    /products/variants/:variantId   update variant (barcode, cost, price extra, active)
GET    /products/variants/:variantId   single variant with full attribute values

GET    /product-attributes             list attributes
POST   /product-attributes             create
PUT    /product-attributes/:id         update
DELETE /product-attributes/:id         soft delete

GET    /product-attributes/:id/values  list values for an attribute
POST   /product-attributes/:id/values  add value
PUT    /product-attribute-values/:id   update value
DELETE /product-attribute-values/:id   soft delete value
```

### UI — Product Detail Page (variants tab)

```
Tab: Variants (shown only when hasVariants = true)

Section 1 — Attributes & Values:
  Table (inline editable):
    Attribute | Values (chips) | Display Type | Price Extra per Value
    "Add a line" button
  [Generate Variants] button → creates/updates variants

Section 2 — Variants Table:
  Columns: Variant | Barcode | Internal Ref | Price Extra | Cost | Active
  Inline edit: barcode, internal ref, price extra, cost
  Active toggle per variant

Variant images:
  Upload separate image per variant (e.g. red product photo)
```

### UI — Variant Selector on Sale Order / Invoice Lines

```
When product is selected and hasVariants = true:
  → Attribute selectors appear inline on the line:
    Color: [○ Red] [● Blue] [○ Green]
    Size:  [○ S] [● M] [○ L]
  → Price updates: base + priceExtra for selected values
  → Resolves to specific productVariantId
  → Barcode/reference shows variant-specific value
```

---

## 6. Down Payments

### What It Is

Invoice a customer partially before the full delivery is done.
The down payment is deducted from the final invoice.

### Flow

```
Sale Order confirmed
  → [Create Invoice ▼] dropdown shows:
      • Invoiceable Lines (regular)
      • Down Payment (%)
      • Down Payment (fixed amount)

Down Payment selected:
  → Invoice created for partial amount (e.g. 30%)
  → Customer pays → AR reconciled

Delivery validated → ready for final invoice:
  → Create invoice from SO again
  → System auto-adds "Deduct Down Payment" line (negative)
  → Final invoice = full amount - down payment already paid
```

### Example

```
Sale Order: 100,000 EGP

Down Payment Invoice (30%):
  Line 1: Down Payment (30%)    30,000 EGP
  Customer pays 30,000

Final Invoice:
  Line 1: Laptop Pro x4         100,000 EGP
  Line 2: Deduct Down Payment   -30,000 EGP
  Total Due:                     70,000 EGP
```

### Storage

```
down_payments:
  id, tenantId, branchId
  saleOrderId → sales_orders
  invoiceId   → invoices (the down payment invoice)
  type: percentage | fixed
  value: 30 (%) or 5000 (fixed)
  amount: computed EGP amount
  isDeducted: false until final invoice created
```

### API Endpoints

```
POST   /sale-orders/:id/down-payment
       Body: { type: "percentage"|"fixed", value: 30 }
       Creates down payment invoice + returns it

POST   /sale-orders/:id/invoice
       Body: { deductDownPayments: true }
       Creates final invoice, deducting all undeducted down payments
```

### UI — Create Invoice Modal (from Sale Order)

```
[Create Invoice ▼] button on confirmed SO → dropdown:
  • Regular Invoice (invoiceable lines)
  • Down Payment

Down Payment selected → modal:
  ┌─────────────────────────────────────────┐
  │  Down Payment Type                      │
  │  ○ Percentage    ● Fixed Amount         │
  │                                         │
  │  Value: [30] %                          │
  │  Amount: 30,000 EGP (computed)          │
  │                                         │
  │  Down Payment Account: [select account] │
  │                    [Create] [Cancel]    │
  └─────────────────────────────────────────┘

On final invoice: deduction line shown automatically
"Deducted Down Payments" section in invoice footer
```

---

## 7. Email Templates

### What It Is

Predefined email templates per document type with dynamic variables.
Used for sending invoices, order confirmations, payment receipts, etc.

### Variables System

```
Variables use {{ }} syntax resolved at send time:
  {{ record.invoiceNumber }}
  {{ record.partner.nameEn }}
  {{ record.amountTotal }}
  {{ record.dueDate }}
  {{ company.nameEn }}
  {{ user.firstName }}
```

### Default Templates (auto-seeded per tenant)

```
Model            | Template Name          | Trigger
invoice          | Invoice Sent           | Manual send
invoice          | Payment Receipt        | After payment
sale_order       | Order Confirmation     | On confirm
purchase_order   | RFQ Sent               | Manual send
leave_request    | Leave Approved         | On approval
payslip          | Payslip Sent           | Manual send
helpdesk_ticket  | Ticket Received        | On creation
```

### Storage — PostgreSQL

```
email_templates:
  id, tenantId
  nameEn, nameAr
  model                    -- which record type
  subject                  -- "Invoice {{ record.invoiceNumber }} from {{ company.nameEn }}"
  bodyEn (HTML)            -- full email body with variables
  bodyAr (HTML)
  fromEmail                -- override sender
  replyTo
  autoAttachPdf            -- attach generated PDF automatically
  ccEmails                 -- comma separated
  isDefault                -- one default per model
```

### API Endpoints

```
GET    /email-templates              list (filter: model)
POST   /email-templates              create
GET    /email-templates/:id          single
PUT    /email-templates/:id          update
DELETE /email-templates/:id          soft delete

POST   /email-templates/:id/preview
       Body: { recordId }
       Returns rendered HTML with variables resolved

POST   /email-templates/send
       Body: { templateId, recordId, toEmails[], extraNote? }
       Sends email via outbox_events → queued delivery
```

### UI — Send Email Modal (on Invoice, SO, PO, etc.)

```
Triggered by: [Send & Print] button or [✉ Send] button

┌──────────────────────────────────────────────────┐
│  Send Invoice                                    │
├──────────────────────────────────────────────────┤
│  To:      [ahmed@alnour.com ×] [+ add]           │
│  Subject: Invoice INV/CAI/2024/0001 from Tatweer │
│  Template: [Invoice Sent ▼]                      │
├──────────────────────────────────────────────────┤
│  [Preview rendered email — iframe]               │
│                                                  │
│  Dear Ahmed Ali,                                 │
│  Please find attached invoice INV/CAI/2024/0001  │
│  for 11,400 EGP due on January 30, 2024...       │
├──────────────────────────────────────────────────┤
│  📎 INV-CAI-2024-0001.pdf  (auto-attached)       │
│  [+ Attach more files]                           │
├──────────────────────────────────────────────────┤
│                        [Send]  [Discard]         │
└──────────────────────────────────────────────────┘

After send: log note posted on chatter automatically
```

### Email Template Editor Page

```
Route: /settings/email-templates

List: Model | Template Name | Subject | Default toggle | Last Modified

Detail Page:
  Tab 1 — Content:
    Subject (with variable hints)
    Language toggle: [EN] [AR]
    Rich HTML editor with variable insertion toolbar
    Variable reference sidebar: {{ record.* }} | {{ company.* }}
  Tab 2 — Settings:
    From Email, Reply To, CC
    Auto-attach PDF toggle
    Trigger: Manual only | Auto on event
  Tab 3 — Preview:
    Record selector → renders live preview
```

---

## 8. Print Templates (PDF)

### What It Is

Each document type has one or more printable PDF layouts.
Generated server-side. Supports Arabic RTL layout.

### Documents That Have Print Templates

```
invoice          → A4 tax invoice (ETA compliant for Egypt)
bill             → vendor bill PDF
sale_order       → quotation / sales order PDF
purchase_order   → purchase order PDF
delivery         → delivery note / packing slip
payslip          → payslip PDF
leave_request    → leave approval PDF (HR)
payment_receipt  → payment receipt PDF
```

### PDF Generation

```
Engine: Puppeteer (headless Chrome) or wkhtmltopdf
Template: HTML/CSS (Jinja-like with Handlebars)
RTL: automatic when language = Arabic (dir="rtl")
Output: PDF buffer → returned as download or auto-attached to email
```

### API Endpoints

```
POST   /print/:model/:recordId
       Query: { templateId?, language? }
       Returns: PDF buffer (application/pdf)
       Used by: [Print] button, email attachment

GET    /print-templates              list (filter: model)
POST   /print-templates              create (upload HTML template)
GET    /print-templates/:id          single
PUT    /print-templates/:id          update
POST   /print-templates/:id/preview
       Body: { recordId }
       Returns: PDF preview
```

### Tax Invoice Template (Egypt — ETA Compliant)

```
Header:
  Company logo (left) | Company name (right, AR+EN)
  "TAX INVOICE / فاتورة ضريبية" title
  Invoice number | Date | ETA UUID (if submitted)

Bill To:
  Customer name (AR+EN) | Tax number | Address

Lines Table:
  # | Description | Qty | Unit | Unit Price | Discount | VAT % | Subtotal

Footer:
  Subtotal (excl. VAT)
  VAT Amount
  Total (incl. VAT)
  Amount in words (Arabic)
  QR Code (ETA e-invoice QR)

Footer bar:
  Company address | Phone | Email | Tax registration number
```

### UI — Print Button

```
Every document detail page has:
  [🖨 Print ▼] dropdown:
    • Print (current language)
    • Print in Arabic
    • Print in English
    • Download PDF
    • Send by Email

On click → API call → browser opens PDF in new tab
```

---

## SHARED COMPONENT SUMMARY (add to existing list)

```
<ChatterPanel model recordId readonly? />
<ActivityIndicator model recordId />              -- for list page rows
<ActivityPanel model recordId />                  -- for detail pages
<FiscalPositionBanner fiscalPositionId />
<VariantSelector productId value onChange />
<SendEmailModal model recordId onClose />
<PrintButton model recordId />
<DownPaymentModal saleOrderId onSuccess />
```

---

## IMPLEMENTATION ORDER (recommended)

Build these in this order — each depends on the previous:

```
1. Email Templates      → needed by almost everything (send invoices, orders)
2. Print Templates      → needed by invoices, orders, payslips
3. Chatter              → internal notes + log on every record
4. Activities           → follow-up calls/meetings (depends on Chatter)
5. Fiscal Positions     → add to partners + invoices + orders
6. Product Variants     → add to products + all order lines
7. Bank Statements      → after payments module is complete
8. Down Payments        → after invoices module is complete
```
