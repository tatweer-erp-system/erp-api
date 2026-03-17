/**
 * Saudi Chart of Accounts — default template for new tenants.
 * Production data imported by TenantProvisionerService during tenant creation.
 */
import { AccountType } from '@/common/enums/accounting.enums';

export interface CoaAccountDefault {
  code: string;
  nameEn: string;
  nameAr: string;
  accountType: AccountType;
  normalBalance: 'debit' | 'credit';
  allowDirectPosting: boolean;
  isActive: boolean;
}

export const SAUDI_COA_DEFAULTS: CoaAccountDefault[] = [
  // ── Assets ──────────────────────────────────────────────────────────────────
  {
    code: '1100',
    nameEn: 'Cash and Cash Equivalents',
    nameAr: 'النقد وما في حكمه',
    accountType: AccountType.ASSET,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '1200',
    nameEn: 'Accounts Receivable',
    nameAr: 'ذمم مدينة',
    accountType: AccountType.ASSET,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '1300',
    nameEn: 'Inventory',
    nameAr: 'المخزون',
    accountType: AccountType.ASSET,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '1400',
    nameEn: 'Prepaid Expenses',
    nameAr: 'مصروفات مدفوعة مقدماً',
    accountType: AccountType.ASSET,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '1500',
    nameEn: 'Fixed Assets',
    nameAr: 'الأصول الثابتة',
    accountType: AccountType.ASSET,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '1510',
    nameEn: 'Accumulated Depreciation',
    nameAr: 'مجمع الاستهلاك',
    accountType: AccountType.ASSET,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },

  // ── Liabilities ─────────────────────────────────────────────────────────────
  {
    code: '2100',
    nameEn: 'Accounts Payable',
    nameAr: 'ذمم دائنة',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '2200',
    nameEn: 'VAT Payable',
    nameAr: 'ضريبة القيمة المضافة المستحقة',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '2300',
    nameEn: 'Loyalty Points Liability',
    nameAr: 'التزام نقاط الولاء',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '2400',
    nameEn: 'Gift Card Liability',
    nameAr: 'التزام بطاقات الهدايا',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '2500',
    nameEn: 'Salaries Payable',
    nameAr: 'رواتب مستحقة الدفع',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '2600',
    nameEn: 'GOSI Payable',
    nameAr: 'التأمينات الاجتماعية المستحقة',
    accountType: AccountType.LIABILITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },

  // ── Equity ──────────────────────────────────────────────────────────────────
  {
    code: '3100',
    nameEn: 'Share Capital',
    nameAr: 'رأس المال المدفوع',
    accountType: AccountType.EQUITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '3200',
    nameEn: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    accountType: AccountType.EQUITY,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },

  // ── Revenue ─────────────────────────────────────────────────────────────────
  {
    code: '4100',
    nameEn: 'Sales Revenue',
    nameAr: 'إيرادات المبيعات',
    accountType: AccountType.REVENUE,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '4200',
    nameEn: 'Service Revenue',
    nameAr: 'إيرادات الخدمات',
    accountType: AccountType.REVENUE,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '4900',
    nameEn: 'Other Revenue',
    nameAr: 'إيرادات أخرى',
    accountType: AccountType.REVENUE,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },

  // ── Expenses ────────────────────────────────────────────────────────────────
  {
    code: '5100',
    nameEn: 'Cost of Goods Sold',
    nameAr: 'تكلفة البضاعة المباعة',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '5200',
    nameEn: 'Purchases Expense',
    nameAr: 'مصروف المشتريات',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6100',
    nameEn: 'Salaries Expense',
    nameAr: 'مصروف الرواتب',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6200',
    nameEn: 'Rent Expense',
    nameAr: 'مصروف الإيجار',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6300',
    nameEn: 'Utilities Expense',
    nameAr: 'مصروف المرافق',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6400',
    nameEn: 'GOSI Employer Expense',
    nameAr: 'مصروف التأمينات الاجتماعية',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6900',
    nameEn: 'Other Expenses',
    nameAr: 'مصروفات أخرى',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },
  {
    code: '6950',
    nameEn: 'Inventory Adjustment',
    nameAr: 'تسوية المخزون',
    accountType: AccountType.EXPENSE,
    normalBalance: 'debit',
    allowDirectPosting: true,
    isActive: true,
  },

  // ── Foreign Exchange ────────────────────────────────────────────────────────
  {
    code: '7100',
    nameEn: 'Foreign Exchange Gain/Loss',
    nameAr: 'أرباح/خسائر فروق العملة',
    accountType: AccountType.REVENUE,
    normalBalance: 'credit',
    allowDirectPosting: true,
    isActive: true,
  },
];

/**
 * Maps tenant_settings key → COA account code.
 * Used to auto-populate COA account ID settings after accounts are created.
 */
export const COA_SETTING_KEY_MAP: Record<string, string> = {
  coaCash: '1100',
  coaAccountsReceivable: '1200',
  coaInventory: '1300',
  coaSalesRevenue: '4100',
  coaCogs: '5100',
  coaVatPayable: '2200',
  coaLoyaltyLiability: '2300',
  coaGiftCardLiability: '2400',
  coaSalariesPayable: '2500',
  coaGosiPayable: '2600',
  coaSalariesExpense: '6100',
  coaGosiExpense: '6400',
  coaAccountsPayable: '2100',
  coaPurchasesExpense: '5200',
  coaInventoryAdjustment: '6950',
  coaFxGainLoss: '7100',
};
