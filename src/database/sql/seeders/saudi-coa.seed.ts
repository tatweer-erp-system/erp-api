import { AccountType, NormalBalance } from '@/common/enums/accounting.enums';

export interface SeedEntry {
  code: string;
  nameEn: string;
  nameAr: string;
  type: AccountType;
  normalBalance: NormalBalance;
  allowDirectPosting: boolean;
  parentCode?: string;
}

export const SAUDI_COA_SEED: SeedEntry[] = [
  // Assets — header
  {
    code: '1000',
    nameEn: 'Assets',
    nameAr: 'الأصول',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: false,
  },
  // Current Assets
  {
    code: '1100',
    nameEn: 'Cash and Cash Equivalents',
    nameAr: 'النقد وما يعادله',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '1200',
    nameEn: 'Accounts Receivable',
    nameAr: 'ذمم مدينة',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '1300',
    nameEn: 'Inventory',
    nameAr: 'المخزون',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '1400',
    nameEn: 'Prepaid Expenses',
    nameAr: 'مصاريف مدفوعة مقدماً',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  // Fixed Assets
  {
    code: '1500',
    nameEn: 'Fixed Assets',
    nameAr: 'الأصول الثابتة',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: false,
  },
  {
    code: '1510',
    nameEn: 'Accumulated Depreciation',
    nameAr: 'مجمع الاستهلاك',
    type: AccountType.ASSET,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
    parentCode: '1500',
  },
  // Liabilities — header
  {
    code: '2000',
    nameEn: 'Liabilities',
    nameAr: 'الالتزامات',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: false,
  },
  {
    code: '2100',
    nameEn: 'Accounts Payable',
    nameAr: 'ذمم دائنة',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '2200',
    nameEn: 'VAT Payable',
    nameAr: 'ضريبة القيمة المضافة المستحقة',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '2300',
    nameEn: 'Loyalty Points Liability',
    nameAr: 'التزامات نقاط الولاء',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '2400',
    nameEn: 'Gift Card Liability',
    nameAr: 'التزامات بطاقات الهدايا',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '2500',
    nameEn: 'Salaries Payable',
    nameAr: 'رواتب مستحقة الدفع',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '2600',
    nameEn: 'GOSI Payable',
    nameAr: 'التأمينات الاجتماعية المستحقة',
    type: AccountType.LIABILITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  // Equity — header
  {
    code: '3000',
    nameEn: 'Equity',
    nameAr: 'حقوق الملكية',
    type: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: false,
  },
  {
    code: '3100',
    nameEn: 'Share Capital',
    nameAr: 'رأس المال',
    type: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '3200',
    nameEn: 'Retained Earnings',
    nameAr: 'الأرباح المحتجزة',
    type: AccountType.EQUITY,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  // Revenue — header
  {
    code: '4000',
    nameEn: 'Revenue',
    nameAr: 'الإيرادات',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: false,
  },
  {
    code: '4100',
    nameEn: 'Sales Revenue',
    nameAr: 'إيرادات المبيعات',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '4200',
    nameEn: 'Service Revenue',
    nameAr: 'إيرادات الخدمات',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  {
    code: '4900',
    nameEn: 'Other Revenue',
    nameAr: 'إيرادات أخرى',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
  // COGS
  {
    code: '5000',
    nameEn: 'Cost of Goods Sold',
    nameAr: 'تكلفة البضاعة المباعة',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: false,
  },
  {
    code: '5100',
    nameEn: 'Cost of Goods Sold',
    nameAr: 'تكلفة البضاعة المباعة',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  // Operating Expenses
  {
    code: '6000',
    nameEn: 'Operating Expenses',
    nameAr: 'مصاريف التشغيل',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: false,
  },
  {
    code: '6100',
    nameEn: 'Salaries Expense',
    nameAr: 'مصاريف الرواتب',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '6200',
    nameEn: 'Rent Expense',
    nameAr: 'مصاريف الإيجار',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '6300',
    nameEn: 'Utilities Expense',
    nameAr: 'مصاريف المرافق',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '6400',
    nameEn: 'GOSI Employer Expense',
    nameAr: 'مصاريف التأمينات الاجتماعية',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  {
    code: '6900',
    nameEn: 'Other Expenses',
    nameAr: 'مصاريف أخرى',
    type: AccountType.EXPENSE,
    normalBalance: NormalBalance.DEBIT,
    allowDirectPosting: true,
  },
  // FX
  {
    code: '7000',
    nameEn: 'Other Income/Expense',
    nameAr: 'دخل/مصروف آخر',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: false,
  },
  {
    code: '7100',
    nameEn: 'Foreign Exchange Gain/Loss',
    nameAr: 'أرباح/خسائر العملات الأجنبية',
    type: AccountType.REVENUE,
    normalBalance: NormalBalance.CREDIT,
    allowDirectPosting: true,
  },
];
