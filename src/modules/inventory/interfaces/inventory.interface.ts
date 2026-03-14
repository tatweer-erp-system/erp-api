import { ProductStatus, StockMovementType } from '@/common/enums/inventory.enums';
export { ProductStatus, StockMovementType };

export interface CreateProductData {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  unitPrice: number;
  costPrice?: number | null;
  currency?: string;
  unitOfMeasure?: string;
  reorderPoint?: number;
  taxRate?: number;
  isActive?: boolean;
  images?: string[] | null;
  createdBy?: string | null;
}

export interface CreateStockMovementData {
  productId: string;
  warehouseId: string;
  movementType: StockMovementType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  createdBy?: string | null;
  unitCost?: number;
  totalCost?: number;
  currencyId?: string | null;
  lotNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: string | null;
  branchId?: string | null;
}

export interface ValuationReportItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  sku: string;
  warehouseId: string;
  warehouseNameEn: string;
  warehouseNameAr: string;
  currentQty: number;
  averageCost: number;
  totalValue: number;
}

export interface ValuationReport {
  items: ValuationReportItem[];
  grandTotal: number;
}

export interface LowStockJobData {
  tenantSlug: string;
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderPoint: number;
  warehouseId: string;
}
