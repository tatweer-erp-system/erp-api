/**
 * Permission constants and RBAC utilities.
 *
 * Permission format: "module:action"
 *
 * 60 total permissions:
 *   - 9 modules x 6 actions = 54 base permissions
 *   - 6 special permissions
 */

// ── Permission Modules & Actions ────────────────────────────────────────────

export const PERMISSION_MODULES = [
  'crm',
  'hr',
  'inventory',
  'sales',
  'purchasing',
  'projects',
  'settings',
  'reports',
  'notifications',
] as const;

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'export',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// ── Build base matrix (9 modules x 6 actions = 54) ─────────────────────────

const BASE_PERMISSIONS: string[] = [];
for (const mod of PERMISSION_MODULES) {
  for (const action of PERMISSION_ACTIONS) {
    BASE_PERMISSIONS.push(`${mod}:${action}`);
  }
}

// ── Special permissions (6) ─────────────────────────────────────────────────

export const SPECIAL_PERMISSIONS = [
  'settings:manage_roles',
  'settings:manage_billing',
  'settings:manage_sequences',
  'hr:approve_leave',
  'sales:approve_order',
  'purchasing:approve_order',
] as const;

// ── All 60 permissions ──────────────────────────────────────────────────────

export const ALL_PERMISSIONS: string[] = [...BASE_PERMISSIONS, ...SPECIAL_PERMISSIONS];

// ── Named permission constants (for decorator use) ──────────────────────────

export const PERMISSIONS = {
  // CRM
  CRM_VIEW: 'crm:view',
  CRM_CREATE: 'crm:create',
  CRM_UPDATE: 'crm:update',
  CRM_DELETE: 'crm:delete',
  CRM_APPROVE: 'crm:approve',
  CRM_EXPORT: 'crm:export',

  // HR
  HR_VIEW: 'hr:view',
  HR_CREATE: 'hr:create',
  HR_UPDATE: 'hr:update',
  HR_DELETE: 'hr:delete',
  HR_APPROVE: 'hr:approve',
  HR_EXPORT: 'hr:export',
  HR_APPROVE_LEAVE: 'hr:approve_leave',

  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_APPROVE: 'inventory:approve',
  INVENTORY_EXPORT: 'inventory:export',

  // Sales
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_UPDATE: 'sales:update',
  SALES_DELETE: 'sales:delete',
  SALES_APPROVE: 'sales:approve',
  SALES_EXPORT: 'sales:export',
  SALES_APPROVE_ORDER: 'sales:approve_order',

  // Purchasing
  PURCHASING_VIEW: 'purchasing:view',
  PURCHASING_CREATE: 'purchasing:create',
  PURCHASING_UPDATE: 'purchasing:update',
  PURCHASING_DELETE: 'purchasing:delete',
  PURCHASING_APPROVE: 'purchasing:approve',
  PURCHASING_EXPORT: 'purchasing:export',
  PURCHASING_APPROVE_ORDER: 'purchasing:approve_order',

  // Projects
  PROJECTS_VIEW: 'projects:view',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_APPROVE: 'projects:approve',
  PROJECTS_EXPORT: 'projects:export',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_CREATE: 'settings:create',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_DELETE: 'settings:delete',
  SETTINGS_APPROVE: 'settings:approve',
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_MANAGE_ROLES: 'settings:manage_roles',
  SETTINGS_MANAGE_BILLING: 'settings:manage_billing',
  SETTINGS_MANAGE_SEQUENCES: 'settings:manage_sequences',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_CREATE: 'reports:create',
  REPORTS_UPDATE: 'reports:update',
  REPORTS_DELETE: 'reports:delete',
  REPORTS_APPROVE: 'reports:approve',
  REPORTS_EXPORT: 'reports:export',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications:view',
  NOTIFICATIONS_CREATE: 'notifications:create',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_DELETE: 'notifications:delete',
  NOTIFICATIONS_APPROVE: 'notifications:approve',
  NOTIFICATIONS_EXPORT: 'notifications:export',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── System Role Definitions ─────────────────────────────────────────────────

export const SYSTEM_ROLES = [
  'super_admin',
  'manager',
  'employee',
  'accountant',
  'hr_manager',
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * Returns all permissions for a given module (base + special).
 */
function allForModule(mod: string): string[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${mod}:`));
}

/**
 * Role → permissions mapping for system roles.
 * Used during tenant onboarding to seed rolePermissions.
 */
export const ROLE_PERMISSION_MAP: Record<SystemRole, string[]> = {
  super_admin: [...ALL_PERMISSIONS],

  manager: ALL_PERMISSIONS.filter(
    (p) =>
      p !== 'settings:manage_roles' && p !== 'settings:manage_billing' && p !== 'settings:delete',
  ),

  employee: [
    // View on most modules
    'crm:view',
    'inventory:view',
    'sales:view',
    'purchasing:view',
    'projects:view',
    'reports:view',
    'notifications:view',
    // HR: view + create
    'hr:view',
    'hr:create',
  ],

  accountant: [
    ...allForModule('sales'),
    ...allForModule('purchasing'),
    ...allForModule('inventory'),
    ...allForModule('reports'),
  ],

  hr_manager: [...allForModule('hr')],
};

// ── Utility: Expand Wildcards ────────────────────────────────────────────────

function expandWildcards(permissions: string[]): string[] {
  const expanded = new Set<string>();

  for (const perm of permissions) {
    if (perm === '*') {
      for (const p of ALL_PERMISSIONS) {
        expanded.add(p);
      }
    } else if (perm.endsWith(':*')) {
      const module = perm.split(':')[0];
      for (const p of ALL_PERMISSIONS) {
        if (p.startsWith(`${module}:`)) {
          expanded.add(p);
        }
      }
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
 * When rolePermissions array is provided (from DB rolePermissions),
 * it is used directly instead of static ROLE_PERMISSION_MAP.
 *
 * Formula: rolePermissions + extraPermissions - revokedPermissions
 */
export function resolvePermissions(
  rolePermissions: string[],
  extraPermissions: string[] = [],
  revokedPermissions: string[] = [],
): string[] {
  const expanded = expandWildcards([...rolePermissions, ...extraPermissions]);
  const revokedSet = new Set(expandWildcards(revokedPermissions));
  return expanded.filter((p) => !revokedSet.has(p));
}

/**
 * Legacy overload: resolves permissions from a role name string.
 * Used as a fallback when DB permissions are not available.
 */
export function resolvePermissionsByRole(
  role: string,
  extraPermissions: string[] = [],
  revokedPermissions: string[] = [],
): string[] {
  const normalizedRole = role.toLowerCase() as SystemRole;
  const basePermissions = ROLE_PERMISSION_MAP[normalizedRole] ?? [];
  return resolvePermissions(basePermissions, extraPermissions, revokedPermissions);
}
