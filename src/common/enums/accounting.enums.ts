export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum NormalBalance {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum JournalType {
  SALES = 'sales',
  PURCHASE = 'purchase',
  CASH = 'cash',
  BANK = 'bank',
  MISCELLANEOUS = 'miscellaneous',
  PAYROLL = 'payroll',
  INVENTORY = 'inventory',
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum AccountingDocType {
  CUSTOMER_INVOICE = 'customer_invoice',
  CUSTOMER_CREDIT_NOTE = 'customer_credit_note',
  VENDOR_BILL = 'vendor_bill',
  VENDOR_REFUND = 'vendor_refund',
}

export enum AccountingDocStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum AccountingPaymentType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum AccountingPaymentStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum FiscalPeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

// Legacy enums kept for backward compatibility with other modules that may reference them
export enum JournalEntryType {
  MANUAL = 'manual',
  AUTO = 'auto',
  OPENING = 'opening',
  CLOSING = 'closing',
  REVERSAL = 'reversal',
}

export enum FiscalPeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export enum ExchangeRateSource {
  MANUAL = 'manual',
  AUTO = 'auto',
}

export enum TreasuryAccountType {
  CASH = 'cash',
  BANK = 'bank',
}

export enum TreasuryTransactionType {
  RECEIPT = 'receipt',
  PAYMENT = 'payment',
  TRANSFER_IN = 'transferIn',
  TRANSFER_OUT = 'transferOut',
  OPENING_BALANCE = 'openingBalance',
}

export enum ReconciliationStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}
