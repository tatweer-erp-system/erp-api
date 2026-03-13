// Vouchers-gift-cards module interfaces

export interface VoucherValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  voucherId?: string;
}

export interface GiftCardRedeemResult {
  amountDeducted: number;
  remainingToPay: number;
}
