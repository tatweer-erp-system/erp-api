/**
 * Permission constants and RBAC utilities.
 *
 * Permission format: "module:action"
 *
 * Modules are grouped into base modules (standard CRUD actions via matrix)
 * and domain modules with custom action sets. Special permissions are
 * module-specific actions that don't fit the standard matrix.
 */

// ── Permission Modules & Actions ────────────────────────────────────────────

export const PERMISSION_MODULES = [
  'accounting',
  'activities',
  'audit',
  'crm',
  'hr',
  'inventory',
  'invoices',
  'loyalty',
  'notifications',
  'partners',
  'payments',
  'payroll',
  'pos',
  'products',
  'projects',
  'purchasing',
  'reporting',
  'restaurant',
  'sales',
  'settings',
  'treasury',
  'vouchers',
  'zatca',
] as const;

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'export',
  'manage',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// ── Build base matrix (all modules x standard actions) ──────────────────────

const BASE_PERMISSIONS: string[] = [];
for (const mod of PERMISSION_MODULES) {
  for (const action of PERMISSION_ACTIONS) {
    BASE_PERMISSIONS.push(`${mod}:${action}`);
  }
}

// ── Special permissions (domain-specific actions) ───────────────────────────

export const SPECIAL_PERMISSIONS = [
  // Settings
  'settings:manage_roles',
  'settings:manage_billing',
  'settings:manage_sequences',
  // HR
  'hr:approve_leave',
  // Sales
  'sales:approve_order',
  // Purchasing
  'purchasing:approve_order',
  // Accounting
  'accounting:post',
  'accounting:close',
  // Audit
  'audit:read',
  // POS
  'pos:orders',
  'pos:session',
  'pos:admin',
  // Treasury
  'treasury:reconcile',
  // ZATCA
  'zatca:read',
] as const;

// ── All permissions ─────────────────────────────────────────────────────────

export const ALL_PERMISSIONS: string[] = [...BASE_PERMISSIONS, ...SPECIAL_PERMISSIONS];

// ── Named permission constants (for decorator use) ──────────────────────────

export const PERMISSIONS = {
  // Accounting
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE: 'accounting:create',
  ACCOUNTING_UPDATE: 'accounting:update',
  ACCOUNTING_DELETE: 'accounting:delete',
  ACCOUNTING_APPROVE: 'accounting:approve',
  ACCOUNTING_EXPORT: 'accounting:export',
  ACCOUNTING_MANAGE: 'accounting:manage',
  ACCOUNTING_POST: 'accounting:post',
  ACCOUNTING_CLOSE: 'accounting:close',

  // Activities
  ACTIVITIES_VIEW: 'activities:view',
  ACTIVITIES_CREATE: 'activities:create',
  ACTIVITIES_UPDATE: 'activities:update',
  ACTIVITIES_DELETE: 'activities:delete',
  ACTIVITIES_APPROVE: 'activities:approve',
  ACTIVITIES_EXPORT: 'activities:export',
  ACTIVITIES_MANAGE: 'activities:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',
  AUDIT_CREATE: 'audit:create',
  AUDIT_UPDATE: 'audit:update',
  AUDIT_DELETE: 'audit:delete',
  AUDIT_APPROVE: 'audit:approve',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_MANAGE: 'audit:manage',
  AUDIT_READ: 'audit:read',

  // CRM
  CRM_VIEW: 'crm:view',
  CRM_CREATE: 'crm:create',
  CRM_UPDATE: 'crm:update',
  CRM_DELETE: 'crm:delete',
  CRM_APPROVE: 'crm:approve',
  CRM_EXPORT: 'crm:export',
  CRM_MANAGE: 'crm:manage',

  // HR
  HR_VIEW: 'hr:view',
  HR_CREATE: 'hr:create',
  HR_UPDATE: 'hr:update',
  HR_DELETE: 'hr:delete',
  HR_APPROVE: 'hr:approve',
  HR_EXPORT: 'hr:export',
  HR_MANAGE: 'hr:manage',
  HR_APPROVE_LEAVE: 'hr:approve_leave',

  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_APPROVE: 'inventory:approve',
  INVENTORY_EXPORT: 'inventory:export',
  INVENTORY_MANAGE: 'inventory:manage',

  // Invoices
  INVOICES_VIEW: 'invoices:view',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',
  INVOICES_APPROVE: 'invoices:approve',
  INVOICES_EXPORT: 'invoices:export',
  INVOICES_MANAGE: 'invoices:manage',

  // Loyalty
  LOYALTY_VIEW: 'loyalty:view',
  LOYALTY_CREATE: 'loyalty:create',
  LOYALTY_UPDATE: 'loyalty:update',
  LOYALTY_DELETE: 'loyalty:delete',
  LOYALTY_APPROVE: 'loyalty:approve',
  LOYALTY_EXPORT: 'loyalty:export',
  LOYALTY_MANAGE: 'loyalty:manage',

  // Notifications
  NOTIFICATIONS_VIEW: 'notifications:view',
  NOTIFICATIONS_CREATE: 'notifications:create',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_DELETE: 'notifications:delete',
  NOTIFICATIONS_APPROVE: 'notifications:approve',
  NOTIFICATIONS_EXPORT: 'notifications:export',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  // Partners
  PARTNERS_VIEW: 'partners:view',
  PARTNERS_CREATE: 'partners:create',
  PARTNERS_UPDATE: 'partners:update',
  PARTNERS_DELETE: 'partners:delete',
  PARTNERS_APPROVE: 'partners:approve',
  PARTNERS_EXPORT: 'partners:export',
  PARTNERS_MANAGE: 'partners:manage',

  // Payments
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_UPDATE: 'payments:update',
  PAYMENTS_DELETE: 'payments:delete',
  PAYMENTS_APPROVE: 'payments:approve',
  PAYMENTS_EXPORT: 'payments:export',
  PAYMENTS_MANAGE: 'payments:manage',

  // Payroll
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_CREATE: 'payroll:create',
  PAYROLL_UPDATE: 'payroll:update',
  PAYROLL_DELETE: 'payroll:delete',
  PAYROLL_APPROVE: 'payroll:approve',
  PAYROLL_EXPORT: 'payroll:export',
  PAYROLL_MANAGE: 'payroll:manage',

  // POS
  POS_VIEW: 'pos:view',
  POS_CREATE: 'pos:create',
  POS_UPDATE: 'pos:update',
  POS_DELETE: 'pos:delete',
  POS_APPROVE: 'pos:approve',
  POS_EXPORT: 'pos:export',
  POS_MANAGE: 'pos:manage',
  POS_ORDERS: 'pos:orders',
  POS_SESSION: 'pos:session',
  POS_ADMIN: 'pos:admin',

  // Products
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_APPROVE: 'products:approve',
  PRODUCTS_EXPORT: 'products:export',
  PRODUCTS_MANAGE: 'products:manage',

  // Projects
  PROJECTS_VIEW: 'projects:view',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_APPROVE: 'projects:approve',
  PROJECTS_EXPORT: 'projects:export',
  PROJECTS_MANAGE: 'projects:manage',

  // Purchasing
  PURCHASING_VIEW: 'purchasing:view',
  PURCHASING_CREATE: 'purchasing:create',
  PURCHASING_UPDATE: 'purchasing:update',
  PURCHASING_DELETE: 'purchasing:delete',
  PURCHASING_APPROVE: 'purchasing:approve',
  PURCHASING_EXPORT: 'purchasing:export',
  PURCHASING_MANAGE: 'purchasing:manage',
  PURCHASING_APPROVE_ORDER: 'purchasing:approve_order',

  // Reporting
  REPORTING_VIEW: 'reporting:view',
  REPORTING_CREATE: 'reporting:create',
  REPORTING_UPDATE: 'reporting:update',
  REPORTING_DELETE: 'reporting:delete',
  REPORTING_APPROVE: 'reporting:approve',
  REPORTING_EXPORT: 'reporting:export',
  REPORTING_MANAGE: 'reporting:manage',

  // Restaurant
  RESTAURANT_VIEW: 'restaurant:view',
  RESTAURANT_CREATE: 'restaurant:create',
  RESTAURANT_UPDATE: 'restaurant:update',
  RESTAURANT_DELETE: 'restaurant:delete',
  RESTAURANT_APPROVE: 'restaurant:approve',
  RESTAURANT_EXPORT: 'restaurant:export',
  RESTAURANT_MANAGE: 'restaurant:manage',

  // Sales
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_UPDATE: 'sales:update',
  SALES_DELETE: 'sales:delete',
  SALES_APPROVE: 'sales:approve',
  SALES_EXPORT: 'sales:export',
  SALES_MANAGE: 'sales:manage',
  SALES_APPROVE_ORDER: 'sales:approve_order',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_CREATE: 'settings:create',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_DELETE: 'settings:delete',
  SETTINGS_APPROVE: 'settings:approve',
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_MANAGE: 'settings:manage',
  SETTINGS_MANAGE_ROLES: 'settings:manage_roles',
  SETTINGS_MANAGE_BILLING: 'settings:manage_billing',
  SETTINGS_MANAGE_SEQUENCES: 'settings:manage_sequences',

  // Treasury
  TREASURY_VIEW: 'treasury:view',
  TREASURY_CREATE: 'treasury:create',
  TREASURY_UPDATE: 'treasury:update',
  TREASURY_DELETE: 'treasury:delete',
  TREASURY_APPROVE: 'treasury:approve',
  TREASURY_EXPORT: 'treasury:export',
  TREASURY_MANAGE: 'treasury:manage',
  TREASURY_RECONCILE: 'treasury:reconcile',

  // Vouchers
  VOUCHERS_VIEW: 'vouchers:view',
  VOUCHERS_CREATE: 'vouchers:create',
  VOUCHERS_UPDATE: 'vouchers:update',
  VOUCHERS_DELETE: 'vouchers:delete',
  VOUCHERS_APPROVE: 'vouchers:approve',
  VOUCHERS_EXPORT: 'vouchers:export',
  VOUCHERS_MANAGE: 'vouchers:manage',

  // ZATCA
  ZATCA_VIEW: 'zatca:view',
  ZATCA_CREATE: 'zatca:create',
  ZATCA_UPDATE: 'zatca:update',
  ZATCA_DELETE: 'zatca:delete',
  ZATCA_APPROVE: 'zatca:approve',
  ZATCA_EXPORT: 'zatca:export',
  ZATCA_MANAGE: 'zatca:manage',
  ZATCA_READ: 'zatca:read',
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
    'reporting:view',
    'notifications:view',
    'activities:view',
    'partners:view',
    'products:view',
    // HR: view + create
    'hr:view',
    'hr:create',
    // POS: basic access
    'pos:view',
    'pos:orders',
    'pos:session',
  ],

  accountant: [
    ...allForModule('accounting'),
    ...allForModule('invoices'),
    ...allForModule('payments'),
    ...allForModule('treasury'),
    ...allForModule('sales'),
    ...allForModule('purchasing'),
    ...allForModule('inventory'),
    ...allForModule('reporting'),
    ...allForModule('partners'),
  ],

  hr_manager: [...allForModule('hr'), ...allForModule('payroll')],
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
