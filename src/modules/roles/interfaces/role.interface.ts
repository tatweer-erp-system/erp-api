export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  EXPORT = 'export',
}

export type PermissionModule =
  | 'crm'
  | 'hr'
  | 'inventory'
  | 'sales'
  | 'purchasing'
  | 'projects'
  | 'settings'
  | 'reports'
  | 'notifications';

export interface PermissionData {
  module: PermissionModule;
  action: PermissionAction | string;
  description?: string | null;
  conditions?: Record<string, unknown> | null;
}

export interface RoleWithPermissions {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  isSystem: boolean;
  permissions: PermissionData[];
  createdAt: Date;
  updatedAt: Date;
}
