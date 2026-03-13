export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
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

export enum SalesOrderStatus {
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

export enum InvoiceType {
  STANDARD = 'standard',
  SIMPLIFIED = 'simplified',
}

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
