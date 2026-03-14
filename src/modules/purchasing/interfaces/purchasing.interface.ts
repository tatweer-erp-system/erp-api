import { PurchaseOrderStatus, VendorStatus } from '@/common/enums/purchasing.enums';
export { PurchaseOrderStatus, VendorStatus };

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

export interface CreatePurchaseOrderData {
  orderNumber: string;
  vendorId?: string | null;
  branchId?: string | null;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  currencyId?: string | null;
  exchangeRate?: number;
  totalAmountBase?: number | null;
  discountAmount?: number;
  status?: PurchaseOrderStatus;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface PurchasingSummary {
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
  byStatus: Array<{ status: string; count: number; total: number }>;
  byVendor: Array<{
    vendorId: string;
    nameEn: string;
    nameAr: string;
    count: number;
    total: number;
  }>;
  byCurrency: Array<{ currencyId: string; count: number; totalBase: number }>;
}
