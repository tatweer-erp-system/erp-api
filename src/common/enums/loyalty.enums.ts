export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  EXPIRE = 'expire',
  MANUAL = 'manual',
  REFUND = 'refund',
}

export enum VoucherStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum VoucherType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_PRODUCT = 'free_product',
}

export enum GiftCardStatus {
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}
