export interface SalesOrderLineCalculation {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  lineTotalBase?: number;
  currencyId?: string;
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
  totalRevenue: number;
  averageOrderValue: number;
  byStatus: SalesReportStatusBreakdown[];
  byBranch: SalesReportBranchBreakdown[];
  byCurrency: SalesReportCurrencyBreakdown[];
}

export interface SalesReportStatusBreakdown {
  status: string;
  count: number;
  total: number;
}

export interface SalesReportBranchBreakdown {
  branchId: string | null;
  branchName: string | null;
  count: number;
  total: number;
}

export interface SalesReportCurrencyBreakdown {
  currencyId: string | null;
  currencyCode: string | null;
  count: number;
  total: number;
  totalBase: number;
}
