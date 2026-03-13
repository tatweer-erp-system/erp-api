// Accounting module interfaces

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
