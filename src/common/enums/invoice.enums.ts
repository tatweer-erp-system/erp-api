export enum InvoiceTypeNew {
  OUT_INVOICE = 'out_invoice',
  OUT_REFUND = 'out_refund',
  IN_INVOICE = 'in_invoice',
  IN_REFUND = 'in_refund',
}

export enum InvoiceStatusNew {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum InvoicePaymentStatus {
  NOT_PAID = 'not_paid',
  PARTIAL = 'partial',
  PAID = 'paid',
  REVERSED = 'reversed',
}

export enum PaymentTypeNew {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum PaymentStatusNew {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum EtaStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
