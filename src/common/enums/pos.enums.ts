export enum PosOrderStatus {
  OPEN = 'open',
  PAID = 'paid',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
}

export enum PosSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  GIFT_CARD = 'gift_card',
  LOYALTY_POINTS = 'loyalty_points',
  CREDIT = 'credit',
}

export enum OrderType {
  TAKEAWAY = 'takeaway',
  DINE_IN = 'dine_in',
  DELIVERY = 'delivery',
}

export enum CashMovementType {
  CASH_IN = 'cash_in',
  CASH_OUT = 'cash_out',
}

export enum OverrideStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}

export enum ManagerOverrideAction {
  HIGH_DISCOUNT = 'high_discount',
  REFUND = 'refund',
  VOID = 'void',
  UNLOCK = 'unlock',
  PRICE_OVERRIDE = 'price_override',
  REOPEN_SESSION = 'reopen_session',
}

export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  REFUND = 'refund',
  MANUAL = 'manual',
  EXPIRE = 'expire',
}

export enum ProductType {
  STORABLE = 'storable',
  CONSUMABLE = 'consumable',
  SERVICE = 'service',
  COMBO = 'combo',
}

export enum InvoicePolicy {
  ORDERED = 'ordered',
  DELIVERED = 'delivered',
}

export enum VoucherType {
  DISCOUNT = 'discount',
  FREE_ITEM = 'free_item',
  FREE_DELIVERY = 'free_delivery',
}

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

export enum GiftCardTransactionType {
  ISSUE = 'issue',
  REDEEM = 'redeem',
  TOPUP = 'topup',
  EXPIRE = 'expire',
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export enum KitchenTicketStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

export enum CourseType {
  APPETIZER = 'appetizer',
  ENTREE = 'entree',
  DESSERT = 'dessert',
  BEVERAGES = 'beverages',
  ALL = 'all',
}

export enum LoyaltyAdjustAction {
  GRANT = 'grant',
  DEDUCT = 'deduct',
  CORRECTION = 'correction',
}

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning',
}

export enum ZatcaSupplyType {
  GOODS = 'goods',
  SERVICES = 'services',
  MIXED = 'mixed',
}
