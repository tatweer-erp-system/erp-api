export interface PermissionConditions {
  ownedBy?: 'self' | string;
  maxAmount?: number;
  [key: string]: unknown;
}

export interface ResolvedPermission {
  module: string;
  action: string;
  conditions: PermissionConditions | null;
}

export type PermissionString = `${string}:${string}`;
