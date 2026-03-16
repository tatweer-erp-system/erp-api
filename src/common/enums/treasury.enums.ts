export enum TreasuryAccountType {
  CASH = 'cash',
  BANK = 'bank',
  PETTY_CASH = 'petty_cash',
}

export enum TreasuryTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  RECONCILIATION = 'reconciliation',
}

export enum ReconciliationStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  RECONCILED = 'reconciled',
  DISCREPANCY = 'discrepancy',
}
