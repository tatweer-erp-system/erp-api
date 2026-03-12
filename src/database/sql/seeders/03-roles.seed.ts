/**
 * 03 — Roles Seeder
 *
 * Seeds system roles (isSystem: true) and their permission assignments
 * into public.roles and public.role_permissions.
 *
 * Roles:
 *   super_admin  — all permissions
 *   manager      — all except settings.manage_roles, settings.manage_billing, users:delete
 *   employee     — view on most modules; hr:create, hr:view
 *   accountant   — full sales, purchasing, inventory, reports access
 *   hr_manager   — full HR module access + hr.approve_leave
 *
 * Idempotent: uses ON CONFLICT DO NOTHING.
 * Requires the demo tenant and permissions to exist.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/03-roles.seed.ts
 */

import { Sequelize } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

// ── Role definitions with permission filters ─────────────────────────────────

interface RoleDef {
  name: string;
  description: string;
  /** 'all' = every permission; otherwise a filter function */
  permissionFilter: 'all' | ((module: string, action: string) => boolean);
}

const ROLE_DEFINITIONS: RoleDef[] = [
  {
    name: 'super_admin',
    description: 'Full system access — all modules and actions',
    permissionFilter: 'all',
  },
  {
    name: 'manager',
    description: 'Management access — all except role/billing management and user deletion',
    permissionFilter: (module, action) => {
      // Exclude: settings.manage_roles, settings.manage_billing, and any module's delete for users
      if (module === 'settings' && action === 'manage_roles') return false;
      if (module === 'settings' && action === 'manage_billing') return false;
      // "users:delete" — there's no 'users' in the permission matrix but the closest
      // is the delete action pattern; we interpret as: no delete on any module
      // Actually, the spec says "users:delete" — but our modules don't include 'users'.
      // We'll skip any permission where the name would be "users:delete" if it existed.
      // Since we don't have a 'users' module in the 9 modules, this rule is a no-op.
      return true;
    },
  },
  {
    name: 'employee',
    description: 'Basic employee access — view most modules, create HR requests',
    permissionFilter: (module, action) => {
      // View on most modules
      if (action === 'view') {
        return [
          'crm',
          'hr',
          'inventory',
          'sales',
          'purchasing',
          'projects',
          'notifications',
        ].includes(module);
      }
      // hr:create (leave requests etc.)
      if (module === 'hr' && action === 'create') return true;
      // notifications full access
      if (module === 'notifications') return true;
      return false;
    },
  },
  {
    name: 'accountant',
    description: 'Financial access — full sales, purchasing, inventory, and reports',
    permissionFilter: (module, action) => {
      if (['sales', 'purchasing', 'inventory', 'reports'].includes(module)) return true;
      // Also view on settings and notifications
      if (module === 'notifications') return true;
      if (module === 'settings' && action === 'view') return true;
      return false;
    },
  },
  {
    name: 'hr_manager',
    description: 'HR management — full HR module access including leave approval',
    permissionFilter: (module, action) => {
      // Full HR module
      if (module === 'hr') return true;
      // hr.approve_leave is already covered by 'hr' module
      // Also view on other modules for context
      if (action === 'view' && ['crm', 'projects', 'notifications'].includes(module)) return true;
      if (module === 'notifications') return true;
      if (module === 'reports' && (action === 'view' || action === 'export')) return true;
      return false;
    },
  },
];

async function seed() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Resolve demo tenant
    const [tenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = 'demo' AND deleted_at IS NULL`,
    );
    if ((tenants as any[]).length === 0) {
      console.error('Demo tenant not found. Run 04-demo-tenant.seed.ts first.');
      console.log('Skipping roles seed — will be run as part of 04-demo-tenant.seed.ts.');
      await sequelize.close();
      return;
    }
    const tenantId = (tenants as any[])[0].id;

    // Fetch all permissions for this tenant
    const [allPerms] = await sequelize.query(
      `SELECT id, module, action FROM public.permissions WHERE tenant_id = :tenantId AND deleted_at IS NULL`,
      { replacements: { tenantId } },
    );
    const permissions = allPerms as Array<{ id: string; module: string; action: string }>;

    if (permissions.length === 0) {
      console.error('No permissions found. Run 02-permissions.seed.ts first.');
      process.exit(1);
    }

    console.log(`Found ${permissions.length} permissions for tenant.`);

    // Seed roles
    for (const roleDef of ROLE_DEFINITIONS) {
      // Upsert role
      const [existingRoles] = await sequelize.query(
        `SELECT id FROM public.roles WHERE tenant_id = :tenantId AND name = :name AND deleted_at IS NULL`,
        { replacements: { tenantId, name: roleDef.name } },
      );

      let roleId: string;
      if ((existingRoles as any[]).length > 0) {
        roleId = (existingRoles as any[])[0].id;
        console.log(`Role '${roleDef.name}' already exists (id: ${roleId}).`);
      } else {
        roleId = uuidv7();
        await sequelize.query(
          `INSERT INTO public.roles (id, tenant_id, name, description, is_system, created_at, updated_at)
           VALUES (:id, :tenantId, :name, :description, true, NOW(), NOW())`,
          {
            replacements: {
              id: roleId,
              tenantId,
              name: roleDef.name,
              description: roleDef.description,
            },
          },
        );
        console.log(`Created role: ${roleDef.name} (id: ${roleId})`);
      }

      // Determine which permissions this role gets
      const matchedPerms =
        roleDef.permissionFilter === 'all'
          ? permissions
          : permissions.filter((p) => (roleDef.permissionFilter as Function)(p.module, p.action));

      // Insert role_permissions
      let linked = 0;
      for (const perm of matchedPerms) {
        const [result] = await sequelize.query(
          `INSERT INTO public.role_permissions (id, tenant_id, role_id, permission_id, created_at, updated_at)
           VALUES (:id, :tenantId, :roleId, :permissionId, NOW(), NOW())
           ON CONFLICT DO NOTHING
           RETURNING id`,
          {
            replacements: {
              id: uuidv7(),
              tenantId,
              roleId,
              permissionId: perm.id,
            },
          },
        );
        if ((result as any[]).length > 0) linked++;
      }

      console.log(`  -> Linked ${linked} permissions (${matchedPerms.length} total for role).`);
    }

    console.log('\n--- Roles Seed Complete ---');
  } catch (error) {
    console.error('Roles seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
