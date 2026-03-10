export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export type PermissionModule =
  | 'admins'
  | 'tenants'
  | 'users'
  | 'roles'
  | 'hr'
  | 'inventory'
  | 'crm'
  | 'purchasing'
  | 'projects'
  | 'chat'
  | 'reporting';

export interface PermissionData {
  module: PermissionModule;
  action: PermissionAction;
  description?: string | null;
  conditions?: Record<string, unknown> | null;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionData[];
  createdAt: Date;
  updatedAt: Date;
}
