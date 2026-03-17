import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_ID = '10000000-0000-0000-0000-000000000001';
const CURRENCY_SAR_ID = '60000000-0000-0000-0000-000000000001';

// ── Stable Tax Group IDs ────────────────────────────────────────────────────
const TAX_GROUP_VAT_ID = '90000000-0000-0000-0000-000000000001';
const TAX_GROUP_WITHHOLDING_ID = '90000000-0000-0000-0000-000000000002';
const TAX_GROUP_EXEMPT_ID = '90000000-0000-0000-0000-000000000003';

// ── Stable Tax IDs ──────────────────────────────────────────────────────────
const TAX_VAT_15_ID = '91000000-0000-0000-0000-000000000001';
const TAX_ZERO_RATED_ID = '91000000-0000-0000-0000-000000000002';
const TAX_EXEMPT_ID = '91000000-0000-0000-0000-000000000003';
const TAX_WITHHOLDING_5_ID = '91000000-0000-0000-0000-000000000004';

// ── Stable Journal IDs ──────────────────────────────────────────────────────
const JOURNAL_SALES_ID = '92000000-0000-0000-0000-000000000001';
const JOURNAL_PURCHASE_ID = '92000000-0000-0000-0000-000000000002';
const JOURNAL_CASH_ID = '92000000-0000-0000-0000-000000000003';
const JOURNAL_BANK_ID = '92000000-0000-0000-0000-000000000004';
const JOURNAL_GENERAL_ID = '92000000-0000-0000-0000-000000000005';
const JOURNAL_PAYROLL_ID = '92000000-0000-0000-0000-000000000006';

// ── Stable Payment Term IDs (new accounting model) ──────────────────────────
const PT_NET30_ID = '93000000-0000-0000-0000-000000000001';
const PT_NET60_ID = '93000000-0000-0000-0000-000000000002';
const PT_5050_ID = '93000000-0000-0000-0000-000000000003';

// ── Stable Account Group IDs ────────────────────────────────────────────────
const AG_CURRENT_ASSETS_ID = '94000000-0000-0000-0000-000000000001';
const AG_FIXED_ASSETS_ID = '94000000-0000-0000-0000-000000000002';
const AG_CURRENT_LIABILITIES_ID = '94000000-0000-0000-0000-000000000003';
const AG_EQUITY_ID = '94000000-0000-0000-0000-000000000004';
const AG_REVENUE_ID = '94000000-0000-0000-0000-000000000005';
const AG_EXPENSES_ID = '94000000-0000-0000-0000-000000000006';

// ── Stable Fiscal Position IDs ──────────────────────────────────────────────
const FP_EXPORT_ID = '95000000-0000-0000-0000-000000000001';
const FP_GOVERNMENT_ID = '95000000-0000-0000-0000-000000000002';

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // TAX GROUPS
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('tax_groups', [
    {
      id: TAX_GROUP_VAT_ID,
      tenantId: TENANT_ID,
      nameEn: 'VAT',
      nameAr: 'ضريبة القيمة المضافة',
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TAX_GROUP_WITHHOLDING_ID,
      tenantId: TENANT_ID,
      nameEn: 'Withholding Tax',
      nameAr: 'ضريبة الاستقطاع',
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TAX_GROUP_EXEMPT_ID,
      tenantId: TENANT_ID,
      nameEn: 'Tax Exempt',
      nameAr: 'معفى من الضريبة',
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TAXES
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('taxes', [
    {
      id: TAX_VAT_15_ID,
      tenantId: TENANT_ID,
      nameEn: 'VAT 15%',
      nameAr: 'ضريبة القيمة المضافة 15%',
      type: 'percentage',
      amount: 15.0,
      scope: 'both',
      includeInPrice: false,
      taxGroupId: TAX_GROUP_VAT_ID,
      saleAccountId: null,
      purchaseAccountId: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TAX_ZERO_RATED_ID,
      tenantId: TENANT_ID,
      nameEn: 'Zero-rated 0%',
      nameAr: 'نسبة صفر 0%',
      type: 'percentage',
      amount: 0.0,
      scope: 'both',
      includeInPrice: false,
      taxGroupId: TAX_GROUP_VAT_ID,
      saleAccountId: null,
      purchaseAccountId: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TAX_EXEMPT_ID,
      tenantId: TENANT_ID,
      nameEn: 'Exempt',
      nameAr: 'معفى',
      type: 'percentage',
      amount: 0.0,
      scope: 'both',
      includeInPrice: false,
      taxGroupId: TAX_GROUP_EXEMPT_ID,
      saleAccountId: null,
      purchaseAccountId: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: TAX_WITHHOLDING_5_ID,
      tenantId: TENANT_ID,
      nameEn: 'Withholding Tax 5%',
      nameAr: 'ضريبة استقطاع 5%',
      type: 'percentage',
      amount: 5.0,
      scope: 'purchase',
      includeInPrice: false,
      taxGroupId: TAX_GROUP_WITHHOLDING_ID,
      saleAccountId: null,
      purchaseAccountId: null,
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
  // JOURNALS
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('journals', [
    {
      id: JOURNAL_SALES_ID,
      tenantId: TENANT_ID,
      nameEn: 'Sales Journal',
      nameAr: 'يومية المبيعات',
      type: 'sale',
      code: 'SINV',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'SINV',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: JOURNAL_PURCHASE_ID,
      tenantId: TENANT_ID,
      nameEn: 'Purchase Journal',
      nameAr: 'يومية المشتريات',
      type: 'purchase',
      code: 'PINV',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'PINV',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: JOURNAL_CASH_ID,
      tenantId: TENANT_ID,
      nameEn: 'Cash Journal',
      nameAr: 'يومية النقد',
      type: 'cash',
      code: 'CSH1',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'CSH',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: JOURNAL_BANK_ID,
      tenantId: TENANT_ID,
      nameEn: 'Bank Journal',
      nameAr: 'يومية البنك',
      type: 'bank',
      code: 'BNK1',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'BNK',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: JOURNAL_GENERAL_ID,
      tenantId: TENANT_ID,
      nameEn: 'Miscellaneous Journal',
      nameAr: 'يومية متنوعة',
      type: 'general',
      code: 'MISC',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'MISC',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: JOURNAL_PAYROLL_ID,
      tenantId: TENANT_ID,
      nameEn: 'Payroll Journal',
      nameAr: 'يومية الرواتب',
      type: 'general',
      code: 'PYRL',
      defaultAccountId: null,
      suspenseAccountId: null,
      currencyId: CURRENCY_SAR_ID,
      sequencePrefix: 'PYRL',
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
  // PAYMENT TERMS + PAYMENT TERM LINES
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('payment_terms', [
    {
      id: PT_NET30_ID,
      tenantId: TENANT_ID,
      nameEn: 'Net 30',
      nameAr: 'صافي 30 يوم',
      descriptionEn: 'Full payment due within 30 days',
      descriptionAr: 'الدفع الكامل خلال 30 يوم',
      daysDue: 30,
      penaltyPercentage: 0,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: PT_NET60_ID,
      tenantId: TENANT_ID,
      nameEn: 'Net 60',
      nameAr: 'صافي 60 يوم',
      descriptionEn: 'Full payment due within 60 days',
      descriptionAr: 'الدفع الكامل خلال 60 يوم',
      daysDue: 60,
      penaltyPercentage: 2,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: PT_5050_ID,
      tenantId: TENANT_ID,
      nameEn: '50/50 Split',
      nameAr: 'تقسيم 50/50',
      descriptionEn: '50% on order, 50% in 30 days',
      descriptionAr: '50% عند الطلب، 50% خلال 30 يوم',
      daysDue: 30,
      penaltyPercentage: 0,
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  await qi.bulkInsert('payment_term_lines', [
    // Net 30: single balance line at 30 days
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      paymentTermId: PT_NET30_ID,
      sequence: 1,
      type: 'balance',
      value: 0,
      days: 30,
      dayOfMonth: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // Net 60: single balance line at 60 days
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      paymentTermId: PT_NET60_ID,
      sequence: 1,
      type: 'balance',
      value: 0,
      days: 60,
      dayOfMonth: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // 50/50: first 50% immediately, balance at 30 days
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      paymentTermId: PT_5050_ID,
      sequence: 1,
      type: 'percent',
      value: 50,
      days: 0,
      dayOfMonth: null,
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
      paymentTermId: PT_5050_ID,
      sequence: 2,
      type: 'balance',
      value: 0,
      days: 30,
      dayOfMonth: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT GROUPS
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('account_groups', [
    {
      id: AG_CURRENT_ASSETS_ID,
      tenantId: TENANT_ID,
      codePrefix: '1',
      nameEn: 'Current Assets',
      nameAr: 'الأصول المتداولة',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: AG_FIXED_ASSETS_ID,
      tenantId: TENANT_ID,
      codePrefix: '15',
      nameEn: 'Fixed Assets',
      nameAr: 'الأصول الثابتة',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: AG_CURRENT_LIABILITIES_ID,
      tenantId: TENANT_ID,
      codePrefix: '2',
      nameEn: 'Current Liabilities',
      nameAr: 'الخصوم المتداولة',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: AG_EQUITY_ID,
      tenantId: TENANT_ID,
      codePrefix: '3',
      nameEn: 'Equity',
      nameAr: 'حقوق الملكية',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: AG_REVENUE_ID,
      tenantId: TENANT_ID,
      codePrefix: '4',
      nameEn: 'Revenue',
      nameAr: 'الإيرادات',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: AG_EXPENSES_ID,
      tenantId: TENANT_ID,
      codePrefix: '5',
      nameEn: 'Expenses',
      nameAr: 'المصروفات',
      parentId: null,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FISCAL POSITIONS + FISCAL POSITION TAXES
  // ═══════════════════════════════════════════════════════════════════════════
  await qi.bulkInsert('fiscal_positions', [
    {
      id: FP_EXPORT_ID,
      tenantId: TENANT_ID,
      nameEn: 'Export (0% VAT)',
      nameAr: 'تصدير (ضريبة صفر)',
      autoDetect: false,
      country: null,
      note: 'Apply zero-rated VAT for export transactions',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: FP_GOVERNMENT_ID,
      tenantId: TENANT_ID,
      nameEn: 'Government Entity',
      nameAr: 'جهة حكومية',
      autoDetect: false,
      country: 'Saudi Arabia',
      note: 'Special tax treatment for government entities',
      isActive: true,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  await qi.bulkInsert('fiscal_position_taxes', [
    // Export: VAT 15% -> Zero-rated 0%
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      fiscalPositionId: FP_EXPORT_ID,
      taxSrcId: TAX_VAT_15_ID,
      taxDestId: TAX_ZERO_RATED_ID,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    // Government: VAT 15% -> Exempt
    {
      id: uuidv7(),
      tenantId: TENANT_ID,
      fiscalPositionId: FP_GOVERNMENT_ID,
      taxSrcId: TAX_VAT_15_ID,
      taxDestId: TAX_EXEMPT_ID,
      createdBy: null,
      updatedBy: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ]);

  console.log(
    '[19-accounting-setup] Seeded 3 tax groups, 4 taxes, 6 journals, 3 payment terms (4 lines), ' +
      '6 account groups, 2 fiscal positions (2 tax mappings).',
  );
}

// Re-export IDs for downstream seeders
export {
  TAX_GROUP_VAT_ID,
  TAX_GROUP_WITHHOLDING_ID,
  TAX_GROUP_EXEMPT_ID,
  TAX_VAT_15_ID,
  TAX_ZERO_RATED_ID,
  TAX_EXEMPT_ID,
  TAX_WITHHOLDING_5_ID,
  JOURNAL_SALES_ID,
  JOURNAL_PURCHASE_ID,
  JOURNAL_CASH_ID,
  JOURNAL_BANK_ID,
  JOURNAL_GENERAL_ID,
  JOURNAL_PAYROLL_ID,
  PT_NET30_ID,
  PT_NET60_ID,
  PT_5050_ID,
  AG_CURRENT_ASSETS_ID,
  AG_FIXED_ASSETS_ID,
  AG_CURRENT_LIABILITIES_ID,
  AG_EQUITY_ID,
  AG_REVENUE_ID,
  AG_EXPENSES_ID,
  FP_EXPORT_ID,
  FP_GOVERNMENT_ID,
};
