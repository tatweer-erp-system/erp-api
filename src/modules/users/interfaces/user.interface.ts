export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLang?: string;
  isActive?: boolean;
  createdBy?: string | null;
}

export interface UpdateUserData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLang?: string;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  updatedBy?: string | null;
}
