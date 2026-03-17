export interface SalesOrderLineCalculation {
  productId: string | null;
  productVariantId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  lineTotalBase: number | null;
  currencyId: string | null;
  sequence: number;
}

export interface SalesOrderCalculationResult {
  lines: SalesOrderLineCalculation[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
}

export interface SalesReportSummary {
  totalOrders: number;
  totalAmount: number;
  avgOrderValue: number;
  byStatus: SalesReportStatusBreakdown[];
}

export interface SalesReportStatusBreakdown {
  status: string;
  count: number;
  total: number;
}

export interface CreateInvoiceFromSOOptions {
  /** 'regular' | 'down_payment_percentage' | 'down_payment_fixed' */
  type: string;
  /** Used for down payment — percentage or fixed amount */
  value?: number;
}
