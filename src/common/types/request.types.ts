import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantSlug: string;
  tenantId?: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantSlug: string;
  tenantId: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  tenantSlug: string;
}
