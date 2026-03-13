export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum PaymentVerificationStatus {
  PAID = 'paid',
  FAILED = 'failed',
}
