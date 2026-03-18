import {
  PurchaseOrderStatus,
  PurchaseOrderBillStatus,
  PurchaseOrderReceiptStatus,
  VendorStatus,
} from '@/common/enums/purchasing.enums';
export { PurchaseOrderStatus, PurchaseOrderBillStatus, PurchaseOrderReceiptStatus, VendorStatus };

export interface CreatePurchaseOrderData {
  orderNumber: string;
  partnerId: string;
  branchId?: string | null;
  buyerId?: string | null;
  paymentTermId?: string | null;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  currencyId?: string | null;
  exchangeRate?: number;
  totalAmountBase?: number | null;
  discountAmount?: number;
  status?: PurchaseOrderStatus;
  billStatus?: PurchaseOrderBillStatus;
  receiptStatus?: PurchaseOrderReceiptStatus;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

/** @deprecated Use PartnersService with isSupplier=true instead */
export interface CreateVendorData {
  nameEn: string;
  nameAr: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
  crNumber?: string | null;
  currencyId?: string | null;
  paymentTermsDays?: number;
  bankName?: string | null;
  bankIban?: string | null;
  isActive?: boolean;
  notes?: string | null;
  createdBy?: string | null;
}

export interface PurchasingSummary {
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  byStatus: Array<{ status: string; count: number; total: number }>;
  byPartner: Array<{
    partnerId: string;
    nameEn: string;
    nameAr: string;
    count: number;
    total: number;
  }>;
  byCurrency: Array<{ currencyCode: string; count: number; totalBase: number }>;
}
