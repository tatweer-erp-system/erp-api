import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-4000-a000-000000000001';
const CURRENCY_SAR_ID = '60000000-0000-4000-a000-000000000001';
const BRANCH_1_ID = '30000000-0000-4000-a000-000000000001';
const BRANCH_2_ID = '30000000-0000-4000-a000-000000000002';

// Partner IDs from 07-crm
const PARTNER_6_ID = '80000000-0000-4000-a000-000000000006'; // Tech Supplies (supplier)
const PARTNER_7_ID = '80000000-0000-4000-a000-000000000007'; // Food Distributors (supplier)
const PARTNER_9_ID = '80000000-0000-4000-a000-000000000009'; // Saudi Paper Co (supplier)

// Product IDs from 06-products
const PRODUCT_1_ID = '71000000-0000-4000-a000-000000000001';
const PRODUCT_2_ID = '71000000-0000-4000-a000-000000000002';
const PRODUCT_3_ID = '71000000-0000-4000-a000-000000000003';
const PRODUCT_4_ID = '71000000-0000-4000-a000-000000000004';
const PRODUCT_5_ID = '71000000-0000-4000-a000-000000000005';
const PRODUCT_6_ID = '71000000-0000-4000-a000-000000000006';
const PRODUCT_7_ID = '71000000-0000-4000-a000-000000000007';

// ── Stable Pricelist IDs ────────────────────────────────────────────────────
const PRICELIST_WHOLESALE_ID = '96000000-0000-4000-a000-000000000001';
const PRICELIST_VIP_ID = '96000000-0000-4000-a000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICELISTS
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('pricelists', [
    {
      id: PRICELIST_WHOLESALE_ID,
      tenantId: TENANT_ID,
      nameEn: 'Wholesale',
      nameAr: 'جملة',
      currencyId: CURRENCY_SAR_ID,
      discountPolicy: 'discount_on_sale',
      startDate: null,
      endDate: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: PRICELIST_VIP_ID,
      tenantId: TENANT_ID,
      nameEn: 'VIP Customers',
      nameAr: 'عملاء مميزون',
      currencyId: CURRENCY_SAR_ID,
      discountPolicy: 'discount_on_sale',
      startDate: null,
      endDate: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICELIST ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('pricelist_items', [
    // Wholesale: 10% discount on all products, min qty 10
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      pricelistId: PRICELIST_WHOLESALE_ID,
      applyOn: 'all',
      productId: null,
      categoryId: null,
      minQty: 10,
      computation: 'percentage',
      price: null,
      discountPct: 10.0,
      startDate: null,
      endDate: null,
      sequence: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // Wholesale: 15% discount on Product 3 (high-value), min qty 5
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      pricelistId: PRICELIST_WHOLESALE_ID,
      applyOn: 'product',
      productId: PRODUCT_3_ID,
      categoryId: null,
      minQty: 5,
      computation: 'percentage',
      price: null,
      discountPct: 15.0,
      startDate: null,
      endDate: null,
      sequence: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // VIP: 20% discount on all products
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      pricelistId: PRICELIST_VIP_ID,
      applyOn: 'all',
      productId: null,
      categoryId: null,
      minQty: 0,
      computation: 'percentage',
      price: null,
      discountPct: 20.0,
      startDate: null,
      endDate: null,
      sequence: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPLIER PRODUCTS (link products to supplier partners with prices)
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('supplier_products', [
    // Tech Supplies -> Products 3, 4
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_3_ID,
      partnerId: PARTNER_6_ID,
      minQty: 1,
      price: 3200.0,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 7,
      sequence: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_4_ID,
      partnerId: PARTNER_6_ID,
      minQty: 10,
      price: 42.0,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 5,
      sequence: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // Food Distributors -> Products 1, 2, 6
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_1_ID,
      partnerId: PARTNER_7_ID,
      minQty: 50,
      price: 10.0,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 3,
      sequence: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_2_ID,
      partnerId: PARTNER_7_ID,
      minQty: 20,
      price: 4.5,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 3,
      sequence: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_6_ID,
      partnerId: PARTNER_7_ID,
      minQty: 30,
      price: 16.0,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 5,
      sequence: 3,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // Saudi Paper Co -> Product 7
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      productId: PRODUCT_7_ID,
      partnerId: PARTNER_9_ID,
      minQty: 100,
      price: 17.5,
      currencyId: CURRENCY_SAR_ID,
      leadTimeDays: 10,
      sequence: 1,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BRANCH PRODUCTS (assign products to branches)
  // ═══════════════════════════════════════════════════════════════════════════
  const allProductIds = [
    PRODUCT_1_ID,
    PRODUCT_2_ID,
    PRODUCT_3_ID,
    PRODUCT_4_ID,
    PRODUCT_5_ID,
    PRODUCT_6_ID,
    PRODUCT_7_ID,
  ];

  const branchProductRows: Array<Record<string, unknown>> = [];

  // All products assigned to Branch 1 (Main)
  for (const productId of allProductIds) {
    branchProductRows.push({
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_1_ID,
      productId,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  // Products 1-4 assigned to Branch 2 (East)
  for (const productId of allProductIds.slice(0, 4)) {
    branchProductRows.push({
      id: uuidv7(),
      tenantId: TENANT_ID,
      branchId: BRANCH_2_ID,
      productId,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  await qi.bulkInsert('branch_products', branchProductRows);

  console.log(
    `[20-partners-extra] Seeded 2 pricelists (3 items), 6 supplier products, ${branchProductRows.length} branch products.`,
  );
}

// Re-export IDs for downstream seeders
export { PRICELIST_WHOLESALE_ID, PRICELIST_VIP_ID };
