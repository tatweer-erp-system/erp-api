export enum AdminStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export interface CreateAdminData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

export interface UpdateAdminData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  lastLoginAt?: Date | null;
}
