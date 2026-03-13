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
  name: string;
  slug: string;
  status?: TenantStatus;
  trialEndsAt?: Date | null;
  settings?: Record<string, unknown>;
  features?: TenantFeatures;
  createdBy?: string | null;
}

export interface UpdateTenantData {
  name?: string;
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
