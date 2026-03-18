import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantSlug: string;
  tenantId: string;
  roles: string[];
  branchId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantSlug: string;
  tenantId: string;
  roles: string[];
  branchId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  tenantSlug: string;
  tenantId: string;
  /** Set by BranchGuard after validating the x-branch-id header */
  branchId?: string;
}
