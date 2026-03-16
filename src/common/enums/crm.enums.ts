export enum LeadStatus {
  NEW = 'new',
  QUALIFIED = 'qualified',
  PROPOSITION = 'proposition',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadActivityType {
  STATUS_CHANGE = 'status_change',
  NOTE = 'note',
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
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

// SalesOrderStatus lives in sales.enums to avoid re-export conflicts.
// Use CrmSalesOrderStatus below for CRM-specific status tracking.
export enum CrmSalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
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

// Re-export InvoiceType from sales.enums for CRM module compatibility
export { InvoiceType } from './sales.enums';

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

export enum CrmStageType {
  PIPELINE = 'pipeline',
  WON = 'won',
  LOST = 'lost',
}

export enum CrmLeadStatus {
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
  WON = 'won',
  LOST = 'lost',
}

export enum ActivityType {
  EMAIL = 'email',
  CALL = 'call',
  MEETING = 'meeting',
  TASK = 'task',
  DEADLINE = 'deadline',
  UPLOAD = 'upload',
}

export enum CrmLeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  SOCIAL = 'social',
  OTHER = 'other',
}

// Re-export SalesOrderStatus from sales.enums for CRM module compatibility
export { SalesOrderStatus } from './sales.enums';
