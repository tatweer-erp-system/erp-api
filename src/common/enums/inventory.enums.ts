export enum StockMovementType {
  PURCHASE_RECEIPT = 'purchase_receipt',
  SALE_DELIVERY = 'sale_delivery',
  POS_SALE = 'pos_sale',
  INTERNAL = 'internal',
  ADJUSTMENT = 'adjustment',
  OPENING = 'opening',
  RETURN = 'return',
  SCRAP = 'scrap',
  /** @deprecated Use specific types instead */
  IN = 'in',
  /** @deprecated Use specific types instead */
  OUT = 'out',
  /** @deprecated Use INTERNAL instead */
  TRANSFER = 'transfer',
}

export enum StockReferenceType {
  PURCHASE_ORDER = 'purchase_order',
  SALES_ORDER = 'sales_order',
  MANUAL = 'manual',
  TRANSFER = 'transfer',
  POS_ORDER = 'pos_order',
  ADJUSTMENT = 'adjustment',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}
