export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
}

export enum ContactType {
  CUSTOMER = 'customer',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  notes?: string | null;
  status?: string;
  assignedTo?: string | null;
  createdBy?: string | null;
}

export interface CreateLeadData {
  title: string;
  contactId?: string | null;
  value?: number | null;
  currency?: string;
  status?: LeadStatus;
  priority?: string;
  assignedTo?: string | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface CreateSalesOrderData {
  orderNumber: string;
  contactId?: string | null;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  status?: SalesOrderStatus;
  notes?: string | null;
  invoiceType?: string;
  transactionType?: string;
  supplyType?: string;
  taxCategory?: string;
  taxExemptionCode?: string | null;
  taxExemptionReason?: string | null;
  originalInvoiceId?: string | null;
  createdBy?: string | null;
}
