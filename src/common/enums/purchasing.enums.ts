export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum PurchaseOrderBillStatus {
  NOTHING = 'nothing',
  TO_BILL = 'to_bill',
  BILLED = 'billed',
}

export enum PurchaseOrderReceiptStatus {
  NOTHING = 'nothing',
  PARTIAL = 'partial',
  RECEIVED = 'received',
}

/** @deprecated Use PartnersService with isSupplier=true instead */
export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}
