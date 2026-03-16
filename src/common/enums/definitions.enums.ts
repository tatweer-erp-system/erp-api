// ── HR Definitions ──────────────────────────────────────────────────────────

export enum TerminationType {
  VOLUNTARY = 'voluntary',
  INVOLUNTARY = 'involuntary',
  END_OF_CONTRACT = 'end_of_contract',
  RETIREMENT = 'retirement',
}

// ── Inventory Definitions ───────────────────────────────────────────────────

export enum UomType {
  UNIT = 'unit',
  WEIGHT = 'weight',
  VOLUME = 'volume',
  LENGTH = 'length',
  TIME = 'time',
}

export enum AdjustmentReasonType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
}

// ── Sales & POS Definitions ─────────────────────────────────────────────────

export enum VoucherDiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum VoidRefundReasonType {
  VOID = 'void',
  REFUND = 'refund',
  BOTH = 'both',
}
