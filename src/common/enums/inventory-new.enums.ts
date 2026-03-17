export enum LocationType {
  INTERNAL = 'internal',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  TRANSIT = 'transit',
  VIRTUAL = 'virtual',
  SCRAP = 'scrap',
}

export enum StockMoveType {
  RECEIPT = 'receipt',
  DELIVERY = 'delivery',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  SCRAP = 'scrap',
  RETURN = 'return',
}

export enum StockMoveStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum DeliveryStatus {
  DRAFT = 'draft',
  READY = 'ready',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum ReceiptStatus {
  DRAFT = 'draft',
  READY = 'ready',
  DONE = 'done',
  CANCELLED = 'cancelled',
}
