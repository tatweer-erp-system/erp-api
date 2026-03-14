import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-0000-0000-000000000001';
const BRANCH_1_ID = '30000000-0000-0000-0000-000000000001';
const BRANCH_2_ID = '30000000-0000-0000-0000-000000000002';
const CURRENCY_SAR_ID = '60000000-0000-0000-0000-000000000001';
const CURRENCY_USD_ID = '60000000-0000-0000-0000-000000000002';
const WAREHOUSE_1_ID = '40000000-0000-0000-0000-000000000001';
const WAREHOUSE_2_ID = '40000000-0000-0000-0000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // Currencies
  await qi.bulkInsert('currencies', [
    {
      id: CURRENCY_SAR_ID,
      tenantId: TENANT_ID,
      code: 'SAR',
      nameEn: 'Saudi Riyal',
      nameAr: 'ريال سعودي',
      symbol: 'ر.س',
      isBase: true,
      isActive: true,
      decimalPlaces: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: CURRENCY_USD_ID,
      tenantId: TENANT_ID,
      code: 'USD',
      nameEn: 'US Dollar',
      nameAr: 'دولار أمريكي',
      symbol: '$',
      isBase: false,
      isActive: true,
      decimalPlaces: 2,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // Exchange rates
  await qi.bulkInsert('exchange_rates', [
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      fromCurrencyId: CURRENCY_USD_ID,
      toCurrencyId: CURRENCY_SAR_ID,
      rate: 3.75,
      rateDate: '2026-01-01',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // Warehouses (camelCase)
  await qi.bulkInsert('warehouses', [
    {
      id: WAREHOUSE_1_ID,
      tenantId: TENANT_ID,
      nameEn: 'Main Warehouse',
      nameAr: 'المستودع الرئيسي',
      descriptionEn: 'Primary warehouse in Riyadh',
      descriptionAr: 'المستودع الأساسي في الرياض',
      location: 'Riyadh Industrial Area',
      branchId: BRANCH_1_ID,
      isActive: true,
      allowNegativeStock: false,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: WAREHOUSE_2_ID,
      tenantId: TENANT_ID,
      nameEn: 'East Warehouse',
      nameAr: 'المستودع الشرقي',
      descriptionEn: 'Eastern region warehouse in Dammam',
      descriptionAr: 'مستودع المنطقة الشرقية في الدمام',
      location: 'Dammam Industrial Area',
      branchId: BRANCH_2_ID,
      isActive: true,
      allowNegativeStock: false,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  console.log('[05-currencies-warehouses] Seeded 2 currencies, 1 exchange rate, and 2 warehouses.');
}
