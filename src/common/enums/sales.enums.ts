export enum SaleOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  SIMPLIFIED = 'simplified',
  STANDARD = 'standard',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT = 'credit',
}

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum SalesInvoiceStatus {
  NOTHING = 'nothing',
  TO_INVOICE = 'to_invoice',
  INVOICED = 'invoiced',
}

export enum SalesDeliveryStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  DONE = 'done',
}

export enum DeliveryStatus {
  READY = 'ready',
  DONE = 'done',
  CANCELLED = 'cancelled',
}
