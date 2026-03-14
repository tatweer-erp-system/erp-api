import { TenantStatus } from '@/common/enums/tenant.enums';
export { TenantStatus };

export interface TenantFeatures {
  hr: boolean;
  inventory: boolean;
  crm: boolean;
  purchasing: boolean;
  projects: boolean;
  chat: boolean;
  reporting: boolean;
}

export interface CreateTenantData {
  nameEn: string;
  nameAr: string;
  slug: string;
  status?: TenantStatus;
  trialEndsAt?: Date | null;
  settings?: Record<string, unknown>;
  features?: TenantFeatures;
  createdBy?: string | null;
}

export interface UpdateTenantData {
  nameEn?: string;
  nameAr?: string;
  slug?: string;
  status?: TenantStatus;
  trialEndsAt?: Date | null;
  suspendedAt?: Date | null;
  suspendReason?: string | null;
  cancelledAt?: Date | null;
  settings?: Record<string, unknown>;
  features?: TenantFeatures;
  updatedBy?: string | null;
}

export interface ProvisionResult {
  tenant: {
    id: string;
    nameEn: string;
    nameAr: string;
    slug: string;
  };
  admin: {
    id: string;
    email: string;
    password: string;
  };
}
