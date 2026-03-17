import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-4000-a000-000000000001';
const BRANCH_1_ID = '30000000-0000-4000-a000-000000000001';
const USER_1_ID = '20000000-0000-4000-a000-000000000001';
const CURRENCY_SAR_ID = '60000000-0000-4000-a000-000000000001';

// Suppliers (partners 6-9 from 07-crm.seed.ts)
const PARTNER_6_ID = '80000000-0000-4000-a000-000000000006'; // Tech Supplies Co
const PARTNER_7_ID = '80000000-0000-4000-a000-000000000007'; // Food Distributors
const PARTNER_8_ID = '80000000-0000-4000-a000-000000000008'; // Office World
const PARTNER_9_ID = '80000000-0000-4000-a000-000000000009'; // Saudi Paper Co

// Products
const PRODUCT_1_ID = '71000000-0000-4000-a000-000000000001'; // Shawarma, 25 SAR (buy at 12)
const PRODUCT_2_ID = '71000000-0000-4000-a000-000000000002'; // Coffee, 15 SAR (buy at 5)
const PRODUCT_3_ID = '71000000-0000-4000-a000-000000000003'; // Laptop, 3999 SAR (buy at 3200)
const PRODUCT_4_ID = '71000000-0000-4000-a000-000000000004'; // Accessories, 89 SAR (buy at 45)
const PRODUCT_6_ID = '71000000-0000-4000-a000-000000000006'; // Specialty Items (buy at 18)

// Purchase Orders
const PO_1_ID = '82000000-0000-4000-a000-000000000001';
const PO_2_ID = '82000000-0000-4000-a000-000000000002';
const PO_3_ID = '82000000-0000-4000-a000-000000000003';
const PO_4_ID = '82000000-0000-4000-a000-000000000004';

// Receipts
const RECEIPT_1_ID = '87000000-0000-4000-a000-000000000001';
const RECEIPT_2_ID = '87000000-0000-4000-a000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  //
  // PO-1: Confirmed — 10x Laptop + 50x Accessories from Tech Supplies
  //   Laptop: 10 * 3200 = 32000
  //   Accessories: 50 * 45 = 2250
  //   subtotal = 34250.00
  //   tax = 34250 * 0.15 = 5137.50
  //   total = 39387.50
  //   billStatus = nothing, receiptStatus = partial (received laptops only)
  //
  // PO-2: Done — 200x Shawarma + 100x Coffee + 150x Specialty from Food Distributors
  //   Shawarma: 200 * 12 = 2400
  //   Coffee: 100 * 5 = 500
  //   Specialty: 150 * 18 = 2700
  //   subtotal = 5600.00
  //   tax = 5600 * 0.15 = 840.00
  //   total = 6440.00
  //   billStatus = billed, receiptStatus = received
  //
  // PO-3: Draft — 25x Accessories from Office World
  //   Accessories: 25 * 45 = 1125
  //   subtotal = 1125.00
  //   tax = 1125 * 0.15 = 168.75
  //   total = 1293.75
  //   billStatus = nothing, receiptStatus = nothing
  //
  // PO-4: Cancelled — 500x Specialty from Saudi Paper Co
  //   subtotal = 9000, tax = 1350, total = 10350

  await qi.bulkInsert('purchase_orders', [
    {
      id: PO_1_ID,
      tenantId: TENANT_ID,
      orderNumber: 'PO-MAIN-00001',
      vendorId: PARTNER_6_ID,
      partnerId: PARTNER_6_ID,
      branchId: BRANCH_1_ID,
      subtotal: 34250.0,
      taxAmount: 5137.5,
      totalAmount: 39387.5,
      currency: 'SAR',
      currencyId: CURRENCY_SAR_ID,
      exchangeRate: 1,
      totalAmountBase: 39387.5,
      discountAmount: 0,
      status: 'confirmed',
      billStatus: 'nothing',
      receiptStatus: 'partial',
      paymentTermId: null,
      buyerId: USER_1_ID,
      expectedDeliveryDate: '2026-04-15',
      receivedAt: null,
      invoiceNumber: null,
      notes: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
    {
      id: PO_2_ID,
      tenantId: TENANT_ID,
      orderNumber: 'PO-MAIN-00002',
      vendorId: PARTNER_7_ID,
      partnerId: PARTNER_7_ID,
      branchId: BRANCH_1_ID,
      subtotal: 5600.0,
      taxAmount: 840.0,
      totalAmount: 6440.0,
      currency: 'SAR',
      currencyId: CURRENCY_SAR_ID,
      exchangeRate: 1,
      totalAmountBase: 6440.0,
      discountAmount: 0,
      status: 'done',
      billStatus: 'billed',
      receiptStatus: 'received',
      paymentTermId: null,
      buyerId: USER_1_ID,
      expectedDeliveryDate: '2026-03-01',
      receivedAt: new Date('2026-03-01'),
      invoiceNumber: 'INV-FD-2026-001',
      notes: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 2,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
    {
      id: PO_3_ID,
      tenantId: TENANT_ID,
      orderNumber: 'PO-MAIN-00003',
      vendorId: PARTNER_8_ID,
      partnerId: PARTNER_8_ID,
      branchId: BRANCH_1_ID,
      subtotal: 1125.0,
      taxAmount: 168.75,
      totalAmount: 1293.75,
      currency: 'SAR',
      currencyId: CURRENCY_SAR_ID,
      exchangeRate: 1,
      totalAmountBase: 1293.75,
      discountAmount: 0,
      status: 'draft',
      billStatus: 'nothing',
      receiptStatus: 'nothing',
      paymentTermId: null,
      buyerId: USER_1_ID,
      expectedDeliveryDate: '2026-04-01',
      receivedAt: null,
      invoiceNumber: null,
      notes: 'Awaiting budget approval',
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: PO_4_ID,
      tenantId: TENANT_ID,
      orderNumber: 'PO-MAIN-00004',
      vendorId: PARTNER_9_ID,
      partnerId: PARTNER_9_ID,
      branchId: BRANCH_1_ID,
      subtotal: 9000.0,
      taxAmount: 1350.0,
      totalAmount: 10350.0,
      currency: 'SAR',
      currencyId: CURRENCY_SAR_ID,
      exchangeRate: 1,
      totalAmountBase: 10350.0,
      discountAmount: 0,
      status: 'cancelled',
      billStatus: 'nothing',
      receiptStatus: 'nothing',
      paymentTermId: null,
      buyerId: USER_1_ID,
      expectedDeliveryDate: '2026-03-20',
      receivedAt: null,
      invoiceNumber: null,
      notes: 'Cancelled — found alternative supplier with better pricing',
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
  ]);

  // ─── Purchase Order Lines ─────────────────────────────────────────────────
  await qi.bulkInsert('purchase_order_lines', [
    // ── PO-1 lines ──
    {
      tenantId: TENANT_ID,
      orderId: PO_1_ID,
      productId: PRODUCT_3_ID,
      productVariantId: null,
      description: 'Laptop - Bulk Purchase',
      quantity: 10,
      unitPrice: 3200.0,
      taxAmount: 4800.0,
      lineTotal: 36800.0,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 36800.0,
      receivedQuantity: 10,
      qtyBilled: 0,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },
    {
      tenantId: TENANT_ID,
      orderId: PO_1_ID,
      productId: PRODUCT_4_ID,
      productVariantId: null,
      description: 'Accessories',
      quantity: 50,
      unitPrice: 45.0,
      taxAmount: 337.5,
      lineTotal: 2587.5,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 2587.5,
      receivedQuantity: 0,
      qtyBilled: 0,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },

    // ── PO-2 lines ──
    {
      tenantId: TENANT_ID,
      orderId: PO_2_ID,
      productId: PRODUCT_1_ID,
      productVariantId: null,
      description: 'Shawarma - Bulk Food Order',
      quantity: 200,
      unitPrice: 12.0,
      taxAmount: 360.0,
      lineTotal: 2760.0,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 2760.0,
      receivedQuantity: 200,
      qtyBilled: 200,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },
    {
      tenantId: TENANT_ID,
      orderId: PO_2_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      description: 'Coffee - Condiments',
      quantity: 100,
      unitPrice: 5.0,
      taxAmount: 75.0,
      lineTotal: 575.0,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 575.0,
      receivedQuantity: 100,
      qtyBilled: 100,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },
    {
      tenantId: TENANT_ID,
      orderId: PO_2_ID,
      productId: PRODUCT_6_ID,
      productVariantId: null,
      description: 'Specialty Items',
      quantity: 150,
      unitPrice: 18.0,
      taxAmount: 405.0,
      lineTotal: 3105.0,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 3105.0,
      receivedQuantity: 150,
      qtyBilled: 150,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
    },

    // ── PO-3 lines ──
    {
      tenantId: TENANT_ID,
      orderId: PO_3_ID,
      productId: PRODUCT_4_ID,
      productVariantId: null,
      description: 'Accessories - Restock',
      quantity: 25,
      unitPrice: 45.0,
      taxAmount: 168.75,
      lineTotal: 1293.75,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 1293.75,
      receivedQuantity: 0,
      qtyBilled: 0,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },

    // ── PO-4 lines ──
    {
      tenantId: TENANT_ID,
      orderId: PO_4_ID,
      productId: PRODUCT_6_ID,
      productVariantId: null,
      description: 'Specialty Items - Large Batch',
      quantity: 500,
      unitPrice: 18.0,
      taxAmount: 1350.0,
      lineTotal: 10350.0,
      currencyId: CURRENCY_SAR_ID,
      lineTotalBase: 10350.0,
      receivedQuantity: 0,
      qtyBilled: 0,
      discountAmount: 0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: oneWeekAgo,
    },
  ]);

  // ─── Receipts ─────────────────────────────────────────────────────────────
  // Receipt 1: Partial receipt for PO-1 — laptops received, accessories not yet
  // Receipt 2: Full receipt for PO-2 — all items received

  await qi.bulkInsert('receipts', [
    {
      id: RECEIPT_1_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      reference: 'IN-00001',
      purchaseOrderId: PO_1_ID,
      partnerId: PARTNER_6_ID,
      status: 'done',
      scheduledDate: oneWeekAgo.toISOString().split('T')[0],
      doneDate: twoDaysAgo,
      responsibleId: USER_1_ID,
      notes: 'Laptops received — accessories shipment pending from supplier',
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
    {
      id: RECEIPT_2_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      reference: 'IN-00002',
      purchaseOrderId: PO_2_ID,
      partnerId: PARTNER_7_ID,
      status: 'done',
      scheduledDate: '2026-03-01',
      doneDate: new Date('2026-03-01'),
      responsibleId: USER_1_ID,
      notes: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: oneWeekAgo,
      updatedAt: new Date('2026-03-01'),
      deletedAt: null,
    },
  ]);

  // ─── Receipt Lines ────────────────────────────────────────────────────────

  await qi.bulkInsert('receipt_lines', [
    // Receipt 1: only laptops received
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      receiptId: RECEIPT_1_ID,
      productId: PRODUCT_3_ID,
      purchaseOrderLineId: null,
      stockMoveId: null,
      productVariantId: null,
      qtyDemand: 10,
      qtyDone: 10,
      unitOfMeasureId: null,
      locationId: null,
      lotNumber: 'LOT-LAP-2026-Q1',
      serialNumber: null,
      expiryDate: null,
      unitCost: 3200.0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: twoDaysAgo,
      deletedAt: null,
    },
    // Receipt 2: all PO-2 items
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      receiptId: RECEIPT_2_ID,
      productId: PRODUCT_1_ID,
      purchaseOrderLineId: null,
      stockMoveId: null,
      productVariantId: null,
      qtyDemand: 200,
      qtyDone: 200,
      unitOfMeasureId: null,
      locationId: null,
      lotNumber: 'LOT-SHAW-2026-02',
      serialNumber: null,
      expiryDate: '2026-06-01',
      unitCost: 12.0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: new Date('2026-03-01'),
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      receiptId: RECEIPT_2_ID,
      productId: PRODUCT_2_ID,
      purchaseOrderLineId: null,
      stockMoveId: null,
      productVariantId: null,
      qtyDemand: 100,
      qtyDone: 100,
      unitOfMeasureId: null,
      locationId: null,
      lotNumber: 'LOT-COFF-2026-02',
      serialNumber: null,
      expiryDate: '2027-03-01',
      unitCost: 5.0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: new Date('2026-03-01'),
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      receiptId: RECEIPT_2_ID,
      productId: PRODUCT_6_ID,
      purchaseOrderLineId: null,
      stockMoveId: null,
      productVariantId: null,
      qtyDemand: 150,
      qtyDone: 150,
      unitOfMeasureId: null,
      locationId: null,
      lotNumber: 'LOT-SPEC-2026-02',
      serialNumber: null,
      expiryDate: '2026-09-01',
      unitCost: 18.0,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneWeekAgo,
      updatedAt: new Date('2026-03-01'),
      deletedAt: null,
    },
  ]);

  console.log(
    '[24-purchase-orders] Seeded 4 purchase orders (8 lines), ' + '2 receipts (4 receipt lines).',
  );
}
