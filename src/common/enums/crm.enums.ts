/**
 * @deprecated Lead pipeline is now stage-based (crm_stages table).
 * Kept for backward compatibility with outbox handlers and status transition service.
 * Use isWon/isLost boolean flags on the lead entity instead.
 */
export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  PROPOSITION = 'proposition',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadType {
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
}

export enum LeadActivityType {
  STAGE_CHANGE = 'stage_change',
  NOTE = 'note',
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  CONVERTED = 'converted',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  COLD_CALL = 'cold_call',
  OTHER = 'other',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ContactStatus {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  CUSTOMER = 'customer',
  INACTIVE = 'inactive',
}

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum SalesOrderInvoiceStatus {
  NOTHING = 'nothing',
  TO_INVOICE = 'to_invoice',
  INVOICED = 'invoiced',
}

export enum SalesOrderDeliveryStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  DONE = 'done',
}

export enum ContactRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  BOTH = 'both',
}

export enum ContactType {
  CUSTOMER = 'customer',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
}

export enum ZatcaInvoiceType {
  STANDARD = 'standard',
  SIMPLIFIED = 'simplified',
}

export enum ZatcaTransactionType {
  SALE = 'sale',
  RETURN = 'return',
  DEBIT_NOTE = 'debit_note',
  CREDIT_NOTE = 'credit_note',
}

export enum ZatcaStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  CLEARED = 'cleared',
  REJECTED = 'rejected',
  NOT_REQUIRED = 'not_required',
}

export enum ZatcaTaxCategory {
  /** Standard rate (15% VAT) */
  S = 'S',
  /** Zero-rated */
  Z = 'Z',
  /** Exempt */
  E = 'E',
  /** Out of scope */
  O = 'O',
}

/** @deprecated Use ZatcaInvoiceType instead */
export enum InvoiceType {
  STANDARD = 'standard',
  SIMPLIFIED = 'simplified',
}

/** @deprecated Use ZatcaTransactionType instead */
export enum TransactionType {
  INVOICE = 'invoice',
  DEBIT_NOTE = 'debit_note',
  CREDIT_NOTE = 'credit_note',
}

export enum SupplyType {
  GOODS = 'goods',
  SERVICES = 'services',
  BOTH = 'both',
}

/** @deprecated Use ZatcaTaxCategory instead */
export enum TaxCategory {
  /** Standard rate (15% VAT) */
  S = 'S',
  /** Zero-rated */
  Z = 'Z',
  /** Exempt */
  E = 'E',
  /** Out of scope */
  O = 'O',
}

export enum SalesDiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}
