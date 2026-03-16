import {
  PricelistApplyOn,
  PricelistComputationType,
  PricelistDiscountPolicy,
  TaxScope,
  TaxType,
} from '@/common/enums/inventory.enums';

export interface TaxRecord {
  id: string;
  tenantId: string;
  nameEn: string;
  nameAr: string;
  type: TaxType;
  scope: TaxScope;
  amount: number;
  includeInPrice: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricelistRecord {
  id: string;
  tenantId: string;
  nameEn: string;
  nameAr: string;
  currencyId: string | null;
  currencyCode?: string;
  currencyNameEn?: string;
  discountPolicy: PricelistDiscountPolicy;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  itemsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricelistItemRecord {
  id: string;
  tenantId: string;
  pricelistId: string;
  applyOn: PricelistApplyOn;
  productId: string | null;
  categoryId: string | null;
  productNameEn?: string;
  productNameAr?: string;
  categoryNameEn?: string;
  categoryNameAr?: string;
  minQty: number;
  computationType: PricelistComputationType;
  fixedPrice: number | null;
  percentDiscount: number | null;
  formulaPriceBasis: number | null;
  formulaDiscount: number | null;
  dateStart: string | null;
  dateEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxFilterOptions {
  search?: string;
  scope?: TaxScope;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PricelistFilterOptions {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
