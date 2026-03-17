export interface StockLocationRecord {
  id: string;
  tenantId: string;
  warehouseId: string | null;
  nameEn: string;
  nameAr: string;
  fullName: string | null;
  parentId: string | null;
  locationType: string;
  isScrap: boolean;
  isReturn: boolean;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StockLocationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'ASC' | 'DESC';
  warehouseId?: string;
  locationType?: string;
  isActive?: boolean;
}
