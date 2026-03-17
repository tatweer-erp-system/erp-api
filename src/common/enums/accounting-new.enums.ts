export enum JournalType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  CASH = 'cash',
  BANK = 'bank',
  GENERAL = 'general',
}

export enum TaxType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum TaxScope {
  SALE = 'sale',
  PURCHASE = 'purchase',
  BOTH = 'both',
}

export enum PaymentTermLineType {
  PERCENT = 'percent',
  FIXED = 'fixed',
  BALANCE = 'balance',
}

export enum JournalEntryTypeNew {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  STOCK = 'stock',
  PAYROLL = 'payroll',
  MANUAL = 'manual',
  REVERSAL = 'reversal',
}
