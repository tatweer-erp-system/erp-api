/**
 * Permission constants and RBAC utilities.
 *
 * Permission format: "module:action"
 * Wildcard: "module:*" grants all actions on a module.
 */

// ── All Available Permissions ────────────────────────────────────────────────

export const PERMISSIONS = {
  // Users
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_LIST: 'users:list',

  // Roles
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_LIST: 'roles:list',

  // HR
  HR_CREATE: 'hr:create',
  HR_READ: 'hr:read',
  HR_UPDATE: 'hr:update',
  HR_DELETE: 'hr:delete',
  HR_LIST: 'hr:list',

  // Inventory
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_LIST: 'inventory:list',

  // CRM
  CRM_CREATE: 'crm:create',
  CRM_READ: 'crm:read',
  CRM_UPDATE: 'crm:update',
  CRM_DELETE: 'crm:delete',
  CRM_LIST: 'crm:list',

  // Purchasing
  PURCHASING_CREATE: 'purchasing:create',
  PURCHASING_READ: 'purchasing:read',
  PURCHASING_UPDATE: 'purchasing:update',
  PURCHASING_DELETE: 'purchasing:delete',
  PURCHASING_LIST: 'purchasing:list',

  // Projects
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_READ: 'projects:read',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_LIST: 'projects:list',

  // Reporting
  REPORTING_CREATE: 'reporting:create',
  REPORTING_READ: 'reporting:read',
  REPORTING_UPDATE: 'reporting:update',
  REPORTING_DELETE: 'reporting:delete',
  REPORTING_LIST: 'reporting:list',
  REPORTING_EXPORT: 'reporting:export',

  // Chat
  CHAT_CREATE: 'chat:create',
  CHAT_READ: 'chat:read',
  CHAT_UPDATE: 'chat:update',
  CHAT_DELETE: 'chat:delete',
  CHAT_LIST: 'chat:list',

  // Notifications
  NOTIFICATIONS_CREATE: 'notifications:create',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_DELETE: 'notifications:delete',
  NOTIFICATIONS_LIST: 'notifications:list',

  // Sales
  SALES_CREATE: 'sales:create',
  SALES_READ: 'sales:read',
  SALES_UPDATE: 'sales:update',
  SALES_DELETE: 'sales:delete',
  SALES_LIST: 'sales:list',

  // Branches
  BRANCHES_CREATE: 'branches:create',
  BRANCHES_READ: 'branches:read',
  BRANCHES_UPDATE: 'branches:update',
  BRANCHES_DELETE: 'branches:delete',
  BRANCHES_LIST: 'branches:list',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── All permissions as flat array ────────────────────────────────────────────

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);

// ── Role → Base Permissions Mapping ──────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],

  manager: [
    'users:read',
    'users:list',
    'roles:read',
    'roles:list',
    'hr:*',
    'inventory:*',
    'crm:*',
    'purchasing:*',
    'projects:*',
    'reporting:*',
    'sales:*',
    'chat:*',
    'notifications:*',
    'branches:read',
    'branches:list',
    'settings:read',
  ],

  accountant: [
    'sales:*',
    'purchasing:*',
    'inventory:read',
    'inventory:list',
    'reporting:*',
    'branches:read',
    'branches:list',
  ],

  employee: [
    'hr:read',
    'inventory:read',
    'inventory:list',
    'crm:read',
    'crm:list',
    'projects:read',
    'projects:list',
    'chat:*',
    'notifications:read',
    'notifications:list',
    'reporting:read',
    'branches:read',
  ],

  cashier: [
    'sales:create',
    'sales:read',
    'sales:list',
    'inventory:read',
    'inventory:list',
    'crm:read',
    'crm:list',
    'branches:read',
  ],
};

// ── Utility: Expand Wildcards ────────────────────────────────────────────────

function expandWildcards(permissions: string[]): string[] {
  const expanded = new Set<string>();

  for (const perm of permissions) {
    if (perm === '*') {
      // Full admin wildcard: add all permissions
      for (const p of ALL_PERMISSIONS) {
        expanded.add(p);
      }
    } else if (perm.endsWith(':*')) {
      // Module wildcard: add all actions for that module
      const module = perm.split(':')[0];
      for (const p of ALL_PERMISSIONS) {
        if (p.startsWith(`${module}:`)) {
          expanded.add(p);
        }
      }
      // Also keep the wildcard itself for frontend pattern matching
      expanded.add(perm);
    } else {
      expanded.add(perm);
    }
  }

  return Array.from(expanded);
}

// ── Resolve Final Permissions ────────────────────────────────────────────────

/**
 * Resolves the final effective permissions for a user.
 *
 * Formula: ROLE_PERMISSIONS[role] + extraPermissions - revokedPermissions
 */
export function resolvePermissions(
  role: string,
  extraPermissions: string[] = [],
  revokedPermissions: string[] = [],
): string[] {
  const basePermissions = ROLE_PERMISSIONS[role.toLowerCase()] ?? [];
  const expanded = expandWildcards([...basePermissions, ...extraPermissions]);

  const revokedSet = new Set(expandWildcards(revokedPermissions));
  return expanded.filter((p) => !revokedSet.has(p));
}
