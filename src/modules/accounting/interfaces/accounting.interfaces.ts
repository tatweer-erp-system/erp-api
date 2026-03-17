// Accounting module interfaces
import { JournalType, JournalEntryTypeNew } from '@/common/enums/accounting-new.enums';

export interface PosOrderPostData {
  entryDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode?: string;
  currencyId?: string;
  orderNumber: string;
}

export interface PayrollPostData {
  entryDate: string;
  netSalaries: number;
  gosiEmployerAmount: number;
  gosiEmployeeAmount: number;
  payrollRunNumber: string;
}

export interface TreasuryReceiptData {
  entryDate: string;
  amount: number;
  currencyCode?: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
}

export interface TreasuryPaymentData {
  entryDate: string;
  amount: number;
  currencyCode?: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
}

export interface TreasuryTransferData {
  entryDate: string;
  amount: number;
  description?: string;
  referenceId?: string;
}

export interface SalesInvoicePostData {
  entryDate: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  partnerId: string;
  referenceId: string;
  referenceType: string;
  arAccountId?: string;
  revenueAccountId?: string;
  vatAccountId?: string;
}

export interface PurchaseBillPostData {
  entryDate: string;
  billNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  partnerId: string;
  referenceId: string;
  referenceType: string;
  apAccountId?: string;
  expenseAccountId?: string;
  trackInputVat?: boolean;
}

export interface StockMovementPostData {
  entryDate: string;
  description: string;
  referenceId: string;
  referenceType: string;
  inventoryAccountId: string;
  counterAccountId: string;
  amount: number;
}

export interface GenericJournalPostData {
  entryDate: string;
  description: string;
  referenceId: string | null;
  referenceType: string;
  journalType?: JournalType;
  entryTypeNew?: JournalEntryTypeNew;
  partnerId?: string | null;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    currencyCode?: string;
    currencyId?: string | null;
    amountCurrency?: number | null;
    exchangeRate?: number;
    partnerId?: string | null;
    costCenterId?: string | null;
  }>;
}
