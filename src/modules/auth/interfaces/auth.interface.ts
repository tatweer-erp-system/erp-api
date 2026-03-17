export interface LoginResponseRole {
  id: string;
  name: string;
}

export interface LoginResponseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  preferredLang: string;
  roles: LoginResponseRole[];
  permissions: string[];
}

export interface LoginResponseTenant {
  slug: string;
  nameEn: string;
  nameAr: string;
  logo: string | null;
}

export interface LoginResponseBranch {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  address: string | null;
  isMain: boolean;
  isActive: boolean;
  isDefault: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: LoginResponseUser;
  tenant: LoginResponseTenant;
  branches: LoginResponseBranch[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastSeenAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface LoginAttemptResult {
  success: boolean;
  locked: boolean;
  remainingAttempts?: number;
}
