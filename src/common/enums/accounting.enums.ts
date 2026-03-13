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

export enum JournalEntryType {
  MANUAL = 'manual',
  AUTO = 'auto',
  OPENING = 'opening',
  CLOSING = 'closing',
  REVERSAL = 'reversal',
}

export enum FiscalPeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
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
