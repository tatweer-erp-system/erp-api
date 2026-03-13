import { PurchaseOrderStatus, VendorStatus } from '@/common/enums/purchasing.enums';
export { PurchaseOrderStatus, VendorStatus };

export interface CreateVendorData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  isActive?: boolean;
  notes?: string | null;
  createdBy?: string | null;
}

export interface CreatePurchaseOrderData {
  orderNumber: string;
  vendorId?: string | null;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  currency?: string;
  status?: PurchaseOrderStatus;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}
