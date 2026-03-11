export interface LoginResponseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  preferredLang: string;
  role: string;
  permissions: string[];
}

export interface LoginResponseTenant {
  slug: string;
  name: string;
  logo: string | null;
}

export interface LoginResponseBranch {
  id: string;
  name: string;
  code: string;
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
