export interface CreatePaymentParams {
  /** Amount in smallest currency unit (halalas for SAR, cents for USD) */
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  transactionId: string;
  status: 'pending' | 'paid' | 'failed';
  /** Redirect URL for hosted payment pages */
  paymentUrl?: string;
  raw: Record<string, unknown>;
}

export interface RefundResult {
  transactionId: string;
  status: 'refunded' | 'failed';
  raw: Record<string, unknown>;
}

export interface IPaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
  refund(transactionId: string, amountInSmallestUnit: number): Promise<RefundResult>;
}
