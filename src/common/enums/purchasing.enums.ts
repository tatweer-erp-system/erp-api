export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SENT = 'sent',
  RECEIVED = 'received',
  INVOICED = 'invoiced',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum PurchaseBillStatus {
  NOTHING = 'nothing',
  TO_BILL = 'to_bill',
  BILLED = 'billed',
}

export enum PurchaseReceiptStatus {
  NOTHING = 'nothing',
  PARTIAL = 'partial',
  RECEIVED = 'received',
}

export enum ReceiptStatus {
  READY = 'ready',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}
