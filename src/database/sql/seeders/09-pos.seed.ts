import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-4000-a000-000000000001';
const BRANCH_1_ID = '30000000-0000-4000-a000-000000000001';
const USER_1_ID = '20000000-0000-4000-a000-000000000001';
const USER_2_ID = '20000000-0000-4000-a000-000000000002';
const TERMINAL_1_ID = 'A0000000-0000-4000-a000-000000000001';
const TERMINAL_2_ID = 'A0000000-0000-4000-a000-000000000002';
const CASHIER_1_ID = 'A1000000-0000-4000-a000-000000000001';
const CASHIER_2_ID = 'A1000000-0000-4000-a000-000000000002';
const SECTION_1_ID = 'C0000000-0000-4000-a000-000000000001';
const SECTION_2_ID = 'C0000000-0000-4000-a000-000000000002';
const TABLE_1_ID = 'C1000000-0000-4000-a000-000000000001';
const TABLE_2_ID = 'C1000000-0000-4000-a000-000000000002';
const TABLE_3_ID = 'C1000000-0000-4000-a000-000000000003';
const TABLE_4_ID = 'C1000000-0000-4000-a000-000000000004';
const TABLE_5_ID = 'C1000000-0000-4000-a000-000000000005';
const TABLE_6_ID = 'C1000000-0000-4000-a000-000000000006';

const PRODUCT_1_ID = '71000000-0000-4000-a000-000000000001'; // Shawarma, 25 SAR
const PRODUCT_2_ID = '71000000-0000-4000-a000-000000000002'; // Coffee, 15 SAR
const PARTNER_1_ID = '80000000-0000-4000-a000-000000000001'; // customer
const PARTNER_2_ID = '80000000-0000-4000-a000-000000000002'; // customer

const SESSION_1_ID = 'A2000000-0000-4000-a000-000000000001';
const SESSION_2_ID = 'A2000000-0000-4000-a000-000000000002';
const ORDER_1_ID = 'A3000000-0000-4000-a000-000000000001';
const ORDER_2_ID = 'A3000000-0000-4000-a000-000000000002';
const ORDER_3_ID = 'A3000000-0000-4000-a000-000000000003';
const ORDER_4_ID = 'A3000000-0000-4000-a000-000000000004';
const ORDER_5_ID = 'A3000000-0000-4000-a000-000000000005';
const PAYMENT_1_ID = 'A4000000-0000-4000-a000-000000000001';
const PAYMENT_2_ID = 'A4000000-0000-4000-a000-000000000002';
const PAYMENT_3_ID = 'A4000000-0000-4000-a000-000000000003';
const PAYMENT_4_ID = 'A4000000-0000-4000-a000-000000000004';
const PAYMENT_5_ID = 'A4000000-0000-4000-a000-000000000005';
const PAYMENT_6_ID = 'A4000000-0000-4000-a000-000000000006';
const REFUND_1_ID = 'A5000000-0000-4000-a000-000000000001';
const REFUND_2_ID = 'A5000000-0000-4000-a000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const pinHash = '$2b$10$8KzaNdKIMyOkASCBFksCqu2lRhMnPVVQDmuxCfMxKEMr1x0hMDKC2';

  // ─── POS Terminals ──────────────────────────────────────────────────────────
  await qi.bulkInsert('pos_terminals', [
    {
      id: TERMINAL_1_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      nameEn: 'Main Terminal',
      nameAr: 'الجهاز الرئيسي',
      isActive: true,
      settings: JSON.stringify({}),
      lastSeenAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TERMINAL_2_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      nameEn: 'Secondary Terminal',
      nameAr: 'الجهاز الثانوي',
      isActive: true,
      settings: JSON.stringify({}),
      lastSeenAt: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ─── POS Cashiers ───────────────────────────────────────────────────────────
  await qi.bulkInsert('pos_cashiers', [
    {
      id: CASHIER_1_ID,
      tenantId: TENANT_ID,
      userId: USER_1_ID,
      pinHash: pinHash,
      displayName: 'Ahmed (Manager)',
      isActive: true,
      maxDiscountPct: 50,
      canRefund: true,
      canVoid: true,
      canOpenDrawer: true,
      failedPinAttempts: 0,
      lockedUntil: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: CASHIER_2_ID,
      tenantId: TENANT_ID,
      userId: USER_2_ID,
      pinHash: pinHash,
      displayName: 'Sara (Cashier)',
      isActive: true,
      maxDiscountPct: 10,
      canRefund: false,
      canVoid: false,
      canOpenDrawer: true,
      failedPinAttempts: 0,
      lockedUntil: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ─── Restaurant Sections ────────────────────────────────────────────────────
  await qi.bulkInsert('restaurant_sections', [
    {
      id: SECTION_1_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      nameEn: 'Main Hall',
      nameAr: 'الصالة الرئيسية',
      descriptionEn: 'Main dining hall on the ground floor',
      descriptionAr: 'صالة الطعام الرئيسية في الطابق الأرضي',
      color: '#1D9E75',
      floorNumber: 1,
      sortOrder: 0,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: SECTION_2_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      nameEn: 'Outdoor Area',
      nameAr: 'المنطقة الخارجية',
      descriptionEn: 'Outdoor seating area on the first floor',
      descriptionAr: 'منطقة الجلوس الخارجية في الطابق الأول',
      color: '#E67E22',
      floorNumber: 1,
      sortOrder: 1,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ─── Restaurant Tables ──────────────────────────────────────────────────────
  await qi.bulkInsert('restaurant_tables', [
    {
      id: TABLE_1_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_1_ID,
      number: 'T1',
      capacity: 4,
      minCapacity: 1,
      status: 'available',
      posX: 100,
      posY: 100,
      shape: 'square',
      width: 80,
      height: 80,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TABLE_2_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_1_ID,
      number: 'T2',
      capacity: 6,
      minCapacity: 2,
      status: 'available',
      posX: 250,
      posY: 100,
      shape: 'square',
      width: 100,
      height: 80,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TABLE_3_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_1_ID,
      number: 'T3',
      capacity: 2,
      minCapacity: 1,
      status: 'available',
      posX: 400,
      posY: 100,
      shape: 'square',
      width: 60,
      height: 60,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TABLE_4_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_2_ID,
      number: 'T4',
      capacity: 4,
      minCapacity: 1,
      status: 'available',
      posX: 100,
      posY: 100,
      shape: 'square',
      width: 80,
      height: 80,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TABLE_5_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_2_ID,
      number: 'T5',
      capacity: 6,
      minCapacity: 2,
      status: 'available',
      posX: 250,
      posY: 100,
      shape: 'square',
      width: 100,
      height: 80,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TABLE_6_ID,
      tenantId: TENANT_ID,
      sectionId: SECTION_2_ID,
      number: 'T6',
      capacity: 2,
      minCapacity: 1,
      status: 'available',
      posX: 400,
      posY: 100,
      shape: 'square',
      width: 60,
      height: 60,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ─── POS Sessions ──────────────────────────────────────────────────────────
  await qi.bulkInsert('pos_sessions', [
    {
      id: SESSION_1_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      cashierId: CASHIER_2_ID,
      terminalId: TERMINAL_1_ID,
      status: 'open',
      openingFloat: 500.0,
      closingFloat: null,
      expectedFloat: null,
      floatDifference: null,
      openedAt: now,
      closedAt: null,
      notes: null,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: SESSION_2_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      cashierId: CASHIER_1_ID,
      terminalId: TERMINAL_2_ID,
      status: 'closed',
      openingFloat: 1000.0,
      closingFloat: 1850.0,
      expectedFloat: 1870.0,
      floatDifference: -20.0,
      openedAt: twoHoursAgo,
      closedAt: oneHourAgo,
      notes: 'Minor cash discrepancy — under by 20 SAR',
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: twoHoursAgo,
      updatedAt: oneHourAgo,
      deletedAt: null,
    },
  ]);

  // ─── POS Orders ─────────────────────────────────────────────────────────────
  // Order 1: Takeaway — 2x Shawarma (25 SAR) + 1x Coffee (15 SAR)
  //   subtotal = 50 + 15 = 65.00
  //   discount = 0
  //   tax = 65.00 * 0.15 = 9.75
  //   total = 65.00 + 9.75 = 74.75
  //
  // Order 2: Dine-in — 1x Shawarma (25 SAR) + 2x Coffee (15 SAR)
  //   subtotal = 25 + 30 = 55.00
  //   discount = 0
  //   tax = 55.00 * 0.15 = 8.25
  //   total = 55.00 + 8.25 = 63.25
  //   partnerId = PARTNER_1_ID (linked customer)
  //
  // Order 3: Delivery — 3x Shawarma (25 SAR) + 2x Coffee (15 SAR)
  //   subtotal = 75 + 30 = 105.00
  //   discount = 0
  //   tax = 105.00 * 0.15 = 15.75
  //   deliveryFee = 15.00
  //   total = 105.00 + 15.75 + 15.00 = 135.75
  //
  // Order 4: Dine-in at TABLE_4 — 1x Shawarma (25 SAR) + 1x Coffee (15 SAR), 10% discount
  //   subtotal = 25 + 15 = 40.00
  //   discount = 40.00 * 0.10 = 4.00
  //   taxable = 40.00 - 4.00 = 36.00
  //   tax = 36.00 * 0.15 = 5.40
  //   total = 36.00 + 5.40 = 41.40
  //   partnerId = PARTNER_2_ID (linked customer)
  //
  // Order 5: Takeaway — 2x Coffee (15 SAR)
  //   subtotal = 30.00
  //   discount = 0
  //   tax = 30.00 * 0.15 = 4.50
  //   total = 30.00 + 4.50 = 34.50

  await qi.bulkInsert('pos_orders', [
    {
      id: ORDER_1_ID,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      orderNumber: 'POS-00001',
      customerId: null,
      partnerId: null,
      invoiceId: null,
      fiscalPositionId: null,
      tableId: null,
      orderType: 'takeaway',
      status: 'paid',
      subtotal: 65.0,
      discountAmount: 0.0,
      taxAmount: 9.75,
      tipAmount: 0.0,
      totalAmount: 74.75,
      deliveryAddress: null,
      deliveryFee: 0.0,
      pointsEarned: null,
      pointsRedeemed: null,
      syncedAt: null,
      pricelistId: null,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: ORDER_2_ID,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      orderNumber: 'POS-00002',
      customerId: PARTNER_1_ID,
      partnerId: PARTNER_1_ID,
      invoiceId: null,
      fiscalPositionId: null,
      tableId: TABLE_1_ID,
      orderType: 'dine_in',
      status: 'paid',
      subtotal: 55.0,
      discountAmount: 0.0,
      taxAmount: 8.25,
      tipAmount: 0.0,
      totalAmount: 63.25,
      deliveryAddress: null,
      deliveryFee: 0.0,
      pointsEarned: null,
      pointsRedeemed: null,
      syncedAt: null,
      pricelistId: null,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: ORDER_3_ID,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      orderNumber: 'POS-00003',
      customerId: null,
      partnerId: null,
      invoiceId: null,
      fiscalPositionId: null,
      tableId: null,
      orderType: 'delivery',
      status: 'paid',
      subtotal: 105.0,
      discountAmount: 0.0,
      taxAmount: 15.75,
      tipAmount: 0.0,
      totalAmount: 135.75,
      deliveryAddress: 'King Fahd Road, Riyadh',
      deliveryFee: 15.0,
      pointsEarned: null,
      pointsRedeemed: null,
      syncedAt: null,
      pricelistId: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      deletedAt: null,
    },
    {
      id: ORDER_4_ID,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      orderNumber: 'POS-00004',
      customerId: PARTNER_2_ID,
      partnerId: PARTNER_2_ID,
      invoiceId: null,
      fiscalPositionId: null,
      tableId: TABLE_4_ID,
      orderType: 'dine_in',
      status: 'paid',
      subtotal: 40.0,
      discountAmount: 4.0,
      taxAmount: 5.4,
      tipAmount: 0.0,
      totalAmount: 41.4,
      deliveryAddress: null,
      deliveryFee: 0.0,
      pointsEarned: null,
      pointsRedeemed: null,
      syncedAt: null,
      pricelistId: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      deletedAt: null,
    },
    {
      id: ORDER_5_ID,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      orderNumber: 'POS-00005',
      customerId: null,
      partnerId: null,
      invoiceId: null,
      fiscalPositionId: null,
      tableId: null,
      orderType: 'takeaway',
      status: 'paid',
      subtotal: 30.0,
      discountAmount: 0.0,
      taxAmount: 4.5,
      tipAmount: 0.0,
      totalAmount: 34.5,
      deliveryAddress: null,
      deliveryFee: 0.0,
      pointsEarned: null,
      pointsRedeemed: null,
      syncedAt: null,
      pricelistId: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      deletedAt: null,
    },
  ]);

  // ─── POS Order Items ────────────────────────────────────────────────────────
  // Order 1 items:
  //   2x Shawarma: unitPrice=25, qty=2, tax=50*0.15=7.50, lineTotal=50+7.50=57.50
  //   1x Coffee:   unitPrice=15, qty=1, tax=15*0.15=2.25, lineTotal=15+2.25=17.25
  //
  // Order 2 items:
  //   1x Shawarma: unitPrice=25, qty=1, tax=25*0.15=3.75, lineTotal=25+3.75=28.75
  //   2x Coffee:   unitPrice=15, qty=2, tax=30*0.15=4.50, lineTotal=30+4.50=34.50
  //
  // Order 3 items:
  //   3x Shawarma: unitPrice=25, qty=3, tax=75*0.15=11.25, lineTotal=75+11.25=86.25
  //   2x Coffee:   unitPrice=15, qty=2, tax=30*0.15=4.50, lineTotal=30+4.50=34.50
  //
  // Order 4 items (10% discount applied per line):
  //   1x Shawarma: unitPrice=25, qty=1, discount=2.50, taxable=22.50, tax=22.50*0.15=3.375, lineTotal=22.50+3.375=25.875
  //   1x Coffee:   unitPrice=15, qty=1, discount=1.50, taxable=13.50, tax=13.50*0.15=2.025, lineTotal=13.50+2.025=15.525
  //
  // Order 5 items:
  //   2x Coffee:   unitPrice=15, qty=2, tax=30*0.15=4.50, lineTotal=30+4.50=34.50

  await qi.bulkInsert('pos_order_items', [
    // ── Order 1 items ──
    {
      orderId: ORDER_1_ID,
      productId: PRODUCT_1_ID,
      productVariantId: null,
      productName: 'Shawarma',
      unitPrice: 25.0,
      quantity: 2.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 7.5,
      lineTotal: 57.5,
      course: null,
      notes: null,
      isFired: false,
      firedAt: null,
      createdAt: now,
    },
    {
      orderId: ORDER_1_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      productName: 'Coffee',
      unitPrice: 15.0,
      quantity: 1.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 2.25,
      lineTotal: 17.25,
      course: null,
      notes: null,
      isFired: false,
      firedAt: null,
      createdAt: now,
    },
    // ── Order 2 items ──
    {
      orderId: ORDER_2_ID,
      productId: PRODUCT_1_ID,
      productVariantId: null,
      productName: 'Shawarma',
      unitPrice: 25.0,
      quantity: 1.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 3.75,
      lineTotal: 28.75,
      course: 'entree',
      notes: null,
      isFired: true,
      firedAt: now,
      createdAt: now,
    },
    {
      orderId: ORDER_2_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      productName: 'Coffee',
      unitPrice: 15.0,
      quantity: 2.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 4.5,
      lineTotal: 34.5,
      course: 'beverages',
      notes: null,
      isFired: true,
      firedAt: now,
      createdAt: now,
    },
    // ── Order 3 items ──
    {
      orderId: ORDER_3_ID,
      productId: PRODUCT_1_ID,
      productVariantId: null,
      productName: 'Shawarma',
      unitPrice: 25.0,
      quantity: 3.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 11.25,
      lineTotal: 86.25,
      course: 'appetizer',
      notes: 'Extra garlic sauce',
      isFired: true,
      firedAt: twoHoursAgo,
      createdAt: twoHoursAgo,
    },
    {
      orderId: ORDER_3_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      productName: 'Coffee',
      unitPrice: 15.0,
      quantity: 2.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 4.5,
      lineTotal: 34.5,
      course: 'beverages',
      notes: null,
      isFired: true,
      firedAt: twoHoursAgo,
      createdAt: twoHoursAgo,
    },
    // ── Order 4 items (10% discount per line) ──
    {
      orderId: ORDER_4_ID,
      productId: PRODUCT_1_ID,
      productVariantId: null,
      productName: 'Shawarma',
      unitPrice: 25.0,
      quantity: 1.0,
      discountAmount: 2.5,
      taxRate: 15.0,
      taxAmount: 3.375,
      lineTotal: 25.875,
      course: 'entree',
      notes: null,
      isFired: true,
      firedAt: twoHoursAgo,
      createdAt: twoHoursAgo,
    },
    {
      orderId: ORDER_4_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      productName: 'Coffee',
      unitPrice: 15.0,
      quantity: 1.0,
      discountAmount: 1.5,
      taxRate: 15.0,
      taxAmount: 2.025,
      lineTotal: 15.525,
      course: 'beverages',
      notes: null,
      isFired: true,
      firedAt: twoHoursAgo,
      createdAt: twoHoursAgo,
    },
    // ── Order 5 items ──
    {
      orderId: ORDER_5_ID,
      productId: PRODUCT_2_ID,
      productVariantId: null,
      productName: 'Coffee',
      unitPrice: 15.0,
      quantity: 2.0,
      discountAmount: 0.0,
      taxRate: 15.0,
      taxAmount: 4.5,
      lineTotal: 34.5,
      course: null,
      notes: null,
      isFired: false,
      firedAt: null,
      createdAt: twoHoursAgo,
    },
  ]);

  // ─── POS Payments ───────────────────────────────────────────────────────────
  // Order 1: Cash payment — customer gave 80 SAR, change = 80 - 74.75 = 5.25
  // Order 2: Card payment — exact amount, no change
  // Order 3: Card payment — exact amount 135.75
  // Order 4: Split payment — 20 cash + 21.40 card = 41.40
  // Order 5: Cash payment — exact amount 34.50

  await qi.bulkInsert('pos_payments', [
    {
      id: PAYMENT_1_ID,
      orderId: ORDER_1_ID,
      method: 'cash',
      amount: 74.75,
      amountGiven: 80.0,
      changeAmount: 5.25,
      reference: null,
      giftCardId: null,
      createdAt: now,
    },
    {
      id: PAYMENT_2_ID,
      orderId: ORDER_2_ID,
      method: 'card',
      amount: 63.25,
      amountGiven: null,
      changeAmount: 0.0,
      reference: 'TXN-20260314-001',
      giftCardId: null,
      createdAt: now,
    },
    {
      id: PAYMENT_3_ID,
      orderId: ORDER_3_ID,
      method: 'card',
      amount: 135.75,
      amountGiven: null,
      changeAmount: 0.0,
      reference: 'TXN-20260314-002',
      giftCardId: null,
      createdAt: twoHoursAgo,
    },
    {
      id: PAYMENT_4_ID,
      orderId: ORDER_4_ID,
      method: 'cash',
      amount: 20.0,
      amountGiven: 20.0,
      changeAmount: 0.0,
      reference: null,
      giftCardId: null,
      createdAt: twoHoursAgo,
    },
    {
      id: PAYMENT_5_ID,
      orderId: ORDER_4_ID,
      method: 'card',
      amount: 21.4,
      amountGiven: null,
      changeAmount: 0.0,
      reference: 'TXN-20260314-003',
      giftCardId: null,
      createdAt: twoHoursAgo,
    },
    {
      id: PAYMENT_6_ID,
      orderId: ORDER_5_ID,
      method: 'cash',
      amount: 34.5,
      amountGiven: 34.5,
      changeAmount: 0.0,
      reference: null,
      giftCardId: null,
      createdAt: twoHoursAgo,
    },
  ]);

  // ─── POS Refunds ────────────────────────────────────────────────────────────
  // Refund 1: Partial refund on Order 1 — refunding 1 Shawarma (25 + 3.75 tax = 28.75)
  // Refund 2: Full refund on Order 5 — customer returned (30 + 4.50 tax = 34.50)

  await qi.bulkInsert('pos_refunds', [
    {
      id: REFUND_1_ID,
      tenantId: TENANT_ID,
      originalOrderId: ORDER_1_ID,
      refundOrderId: null,
      refundType: 'partial',
      totalRefunded: 28.75,
      refundMethod: 'cash',
      reason: 'Customer changed mind about one Shawarma',
      approvedBy: USER_1_ID,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: REFUND_2_ID,
      tenantId: TENANT_ID,
      originalOrderId: ORDER_5_ID,
      refundOrderId: null,
      refundType: 'full',
      totalRefunded: 34.5,
      refundMethod: 'cash',
      reason: 'Customer returned — order was incorrect',
      approvedBy: USER_1_ID,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
      deletedAt: null,
    },
  ]);

  // ─── POS Held Orders ───────────────────────────────────────────────────────

  const heldOrderId = uuidv7();
  const heldOrder2Id = uuidv7();

  await qi.bulkInsert('pos_held_orders', [
    {
      id: heldOrderId,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      tabLabel: 'Waiting Customer',
      cartSnapshot: JSON.stringify([
        {
          productId: PRODUCT_2_ID,
          productName: 'Coffee',
          unitPrice: 15.0,
          quantity: 1,
          discountAmount: 0,
          taxRate: 15.0,
          taxAmount: 2.25,
          lineTotal: 17.25,
        },
      ]),
      createdBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: heldOrder2Id,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      tabLabel: 'VIP Table',
      cartSnapshot: JSON.stringify([
        {
          productId: PRODUCT_1_ID,
          productName: 'Shawarma',
          unitPrice: 25.0,
          quantity: 2,
          discountAmount: 0,
          taxRate: 15.0,
          taxAmount: 7.5,
          lineTotal: 57.5,
        },
      ]),
      createdBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // ─── Cash Movements ─────────────────────────────────────────────────────────

  const cashMovementId = uuidv7();
  const cashMovement2Id = uuidv7();
  const cashMovement3Id = uuidv7();

  await qi.bulkInsert('cash_movements', [
    {
      id: cashMovementId,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      type: 'cash_in',
      amount: 500.0,
      reason: 'Opening float',
      notes: null,
      cashierId: CASHIER_2_ID,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: cashMovement2Id,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      type: 'cash_in',
      amount: 1000.0,
      reason: 'Opening float',
      notes: null,
      cashierId: CASHIER_1_ID,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      deletedAt: null,
    },
    {
      id: cashMovement3Id,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      type: 'cash_out',
      amount: 200.0,
      reason: 'Petty cash withdrawal',
      notes: 'For cleaning supplies',
      cashierId: CASHIER_1_ID,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
      deletedAt: null,
    },
  ]);

  // ─── Manager Overrides ──────────────────────────────────────────────────────

  const managerOverrideId = uuidv7();
  const managerOverride2Id = uuidv7();

  await qi.bulkInsert('manager_overrides', [
    {
      id: managerOverrideId,
      tenantId: TENANT_ID,
      sessionId: SESSION_1_ID,
      orderId: ORDER_1_ID,
      actionType: 'high_discount',
      requestedBy: CASHIER_2_ID,
      approvedBy: CASHIER_1_ID,
      details: JSON.stringify({
        discountPct: 20,
        reason: 'Loyal customer discount',
      }),
      notes: 'Approved by manager for repeat customer',
      createdBy: USER_2_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: managerOverride2Id,
      tenantId: TENANT_ID,
      sessionId: SESSION_2_ID,
      orderId: ORDER_4_ID,
      actionType: 'price_override',
      requestedBy: CASHIER_2_ID,
      approvedBy: CASHIER_1_ID,
      details: JSON.stringify({
        originalPrice: 25.0,
        overridePrice: 22.5,
        productId: PRODUCT_1_ID,
        reason: 'VIP customer special pricing',
      }),
      notes: 'Manager approved price adjustment for VIP guest',
      createdBy: USER_2_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    },
  ]);

  // ─── Table Sessions ─────────────────────────────────────────────────────────

  const tableSessionId = uuidv7();
  const tableSession2Id = uuidv7();

  await qi.bulkInsert('table_sessions', [
    {
      id: tableSessionId,
      tableId: TABLE_1_ID,
      orderId: ORDER_2_ID,
      guestCount: 2,
      seatedAt: now,
      releasedAt: null,
      totalRevenue: 63.25,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: tableSession2Id,
      tableId: TABLE_4_ID,
      orderId: ORDER_4_ID,
      guestCount: 3,
      seatedAt: twoHoursAgo,
      releasedAt: oneHourAgo,
      totalRevenue: 41.4,
      version: 1,
      createdAt: twoHoursAgo,
      updatedAt: oneHourAgo,
    },
  ]);

  // ─── Kitchen Tickets ────────────────────────────────────────────────────────

  const kitchenTicketId = uuidv7();
  const kitchenTicket2Id = uuidv7();
  const kitchenTicket3Id = uuidv7();

  await qi.bulkInsert('kitchen_tickets', [
    {
      id: kitchenTicketId,
      tenantId: TENANT_ID,
      orderId: ORDER_2_ID,
      course: 'entree',
      status: 'served',
      items: JSON.stringify([
        {
          productId: PRODUCT_1_ID,
          productName: 'Shawarma',
          quantity: 1,
          notes: null,
        },
        {
          productId: PRODUCT_2_ID,
          productName: 'Coffee',
          quantity: 2,
          notes: null,
        },
      ]),
      station: 'main_kitchen',
      priority: 0,
      sentAt: now,
      startedAt: now,
      completedAt: now,
      createdBy: USER_2_ID,
      updatedBy: USER_2_ID,
      version: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: kitchenTicket2Id,
      tenantId: TENANT_ID,
      orderId: ORDER_3_ID,
      course: 'appetizer',
      status: 'preparing',
      items: JSON.stringify([
        {
          productId: PRODUCT_1_ID,
          productName: 'Shawarma',
          quantity: 3,
          notes: 'Extra garlic sauce',
        },
      ]),
      station: 'main_kitchen',
      priority: 1,
      sentAt: twoHoursAgo,
      startedAt: twoHoursAgo,
      completedAt: null,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 0,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
    },
    {
      id: kitchenTicket3Id,
      tenantId: TENANT_ID,
      orderId: ORDER_4_ID,
      course: 'entree',
      status: 'completed',
      items: JSON.stringify([
        {
          productId: PRODUCT_1_ID,
          productName: 'Shawarma',
          quantity: 1,
          notes: null,
        },
        {
          productId: PRODUCT_2_ID,
          productName: 'Coffee',
          quantity: 1,
          notes: null,
        },
      ]),
      station: 'main_kitchen',
      priority: 0,
      sentAt: twoHoursAgo,
      startedAt: twoHoursAgo,
      completedAt: oneHourAgo,
      createdBy: USER_1_ID,
      updatedBy: USER_1_ID,
      version: 1,
      createdAt: twoHoursAgo,
      updatedAt: oneHourAgo,
    },
  ]);

  console.log(
    '[09-pos] Seeded 2 terminals, 2 cashiers, 2 sections, 6 tables, ' +
      '2 sessions, 5 orders, 10 order items, 6 payments, 2 refunds, ' +
      '2 held orders, 3 cash movements, 2 manager overrides, ' +
      '2 table sessions, and 3 kitchen tickets.',
  );
}
