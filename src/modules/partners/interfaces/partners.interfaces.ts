import { PartnerType } from '@/common/enums/partner.enums';
export { PartnerType };

export interface CreatePartnerData {
  nameEn: string;
  nameAr: string;
  type: PartnerType;
  isCustomer: boolean;
  isSupplier: boolean;
  taxNumber?: string | null;
  vatNumber?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  creditLimit?: number;
  paymentTermId?: string | null;
  pricelistId?: string | null;
  arAccountId?: string | null;
  apAccountId?: string | null;
  fiscalPositionId?: string | null;
  bankIban?: string | null;
  bankName?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface CreatePartnerContactData {
  partnerId: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  position?: string | null;
  isMain?: boolean;
  createdBy?: string | null;
}

export interface PartnerFilterOptions {
  type?: PartnerType;
  isCustomer?: boolean;
  isSupplier?: boolean;
  isActive?: boolean;
  search?: string;
}
