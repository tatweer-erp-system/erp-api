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

export enum LocationType {
  INTERNAL = 'internal',
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  TRANSIT = 'transit',
  VIRTUAL = 'virtual',
  VIEW = 'view',
}

export enum StockMoveStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum AdjustmentStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  CANCELLED = 'cancelled',
}

export enum TransferStatus {
  DRAFT = 'draft',
  READY = 'ready',
  IN_TRANSIT = 'in_transit',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum ProductType {
  STORABLE = 'storable',
  CONSUMABLE = 'consumable',
  SERVICE = 'service',
}

export enum InvoicePolicy {
  ORDERED = 'ordered',
  DELIVERED = 'delivered',
}

export enum TaxType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum TaxScope {
  SALE = 'sale',
  PURCHASE = 'purchase',
  BOTH = 'both',
}

export enum PricelistDiscountPolicy {
  INCLUDE_IN_PRICE = 'include_in_price',
  DISCOUNT_ON_SALE = 'discount_on_sale',
}

export enum PricelistApplyOn {
  ALL_PRODUCTS = 'all_products',
  PRODUCT_CATEGORY = 'product_category',
  PRODUCT = 'product',
}

export enum PricelistComputationType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  FORMULA = 'formula',
}

export enum UomCategory {
  UNIT = 'unit',
  WEIGHT = 'weight',
  VOLUME = 'volume',
  LENGTH = 'length',
  TIME = 'time',
}

export enum UomType {
  REFERENCE = 'reference',
  BIGGER = 'bigger',
  SMALLER = 'smaller',
}

export enum PartnerType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  BOTH = 'both',
  INDIVIDUAL = 'individual',
}

export enum PaymentTermLineType {
  PERCENT = 'percent',
  FIXED = 'fixed',
  BALANCE = 'balance',
}
