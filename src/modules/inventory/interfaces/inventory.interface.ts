export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
}

export interface LocalizedField {
  en: string;
  ar: string;
}

export interface CreateProductData {
  name: LocalizedField;
  description?: LocalizedField | null;
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
}
