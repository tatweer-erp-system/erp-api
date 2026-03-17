import { Transaction } from 'sequelize';
import { AuditContext } from '@/common/interfaces/repository.interface';
import {
  InvoiceTypeNew,
  InvoiceStatusNew,
  InvoicePaymentStatus,
  PaymentTypeNew,
  PaymentStatusNew,
} from '@/common/enums/invoice.enums';

// ── Invoice ────────────────────────────────────────────────────────────────────

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  branchId: string;
  journalId: string | null;
  partnerId: string;
  invoiceType: InvoiceTypeNew;
  status: InvoiceStatusNew;
  paymentStatus: InvoicePaymentStatus;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  paymentTermId: string | null;
  saleOrderId: string | null;
  purchaseOrderId: string | null;
  journalEntryId: string | null;
  currencyId: string | null;
  exchangeRate: number;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  amountResidual: number;
  amountTotalBase: number;
  reference: string | null;
  narration: string | null;
  fiscalPositionId: string | null;
  zatcaUUID: string | null;
  zatcaHash: string | null;
  zatcaQRCode: string | null;
  zatcaStatus: string | null;
  zatcaInvoiceCounter: number | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvoiceWithLines extends InvoiceRecord {
  lines: InvoiceLineRecord[] | null;
}

export interface InvoiceLineRecord {
  id: string;
  productId: string | null;
  productVariantId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  priceSubtotal: number;
  priceTax: number;
  priceTotal: number;
  accountId: string | null;
  sequence: number;
}

// ── Payment ────────────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string;
  tenantId: string;
  branchId: string;
  journalId: string | null;
  partnerId: string;
  paymentType: PaymentTypeNew;
  status: PaymentStatusNew;
  paymentNumber: string | null;
  paymentDate: string;
  amount: number;
  currencyId: string | null;
  exchangeRate: number;
  amountBase: number;
  memo: string | null;
  journalEntryId: string | null;
  treasuryAccountId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ── Service method params ──────────────────────────────────────────────────────

export interface RegisterPaymentParams {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  memo?: string;
  treasuryAccountId?: string;
  currencyId?: string;
  exchangeRate?: number;
}

export interface InvoiceLineInput {
  productId?: string;
  productVariantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxIds?: string[];
  accountId?: string;
  sequence?: number;
}

export interface ComputedLineTotals {
  priceSubtotal: number;
  priceTax: number;
  priceTotal: number;
}

export interface InvoiceServiceContext {
  tenantId: string;
  auditContext: AuditContext;
  transaction?: Transaction;
}
