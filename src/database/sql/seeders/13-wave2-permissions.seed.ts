/**
 * Wave 2 Permissions Seed
 * Seeds POS and loyalty permissions and assigns them to roles.
 * Run: npx ts-node -r tsconfig-paths/register src/seeds/wave-2-permissions.ts
 */
import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

const PERMISSIONS = [
  { module: 'pos', action: 'orders', description: 'Create and manage POS orders' },
  { module: 'pos', action: 'session', description: 'Open and close POS sessions' },
  { module: 'pos', action: 'manage', description: 'Manage POS configuration' },
  { module: 'pos', action: 'read', description: 'Read POS data and reports' },
  { module: 'loyalty', action: 'read', description: 'View loyalty accounts and transactions' },
  { module: 'loyalty', action: 'manage', description: 'Manage loyalty programs and adjustments' },
  {
    module: 'vouchers',
    action: 'manage',
    description: 'Create and manage vouchers and gift cards',
  },
  { module: 'vouchers', action: 'read', description: 'View vouchers and gift cards' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'pos:orders',
    'pos:session',
    'pos:manage',
    'pos:read',
    'loyalty:read',
    'loyalty:manage',
    'vouchers:manage',
    'vouchers:read',
  ],
  manager: [
    'pos:orders',
    'pos:session',
    'pos:manage',
    'pos:read',
    'loyalty:read',
    'vouchers:manage',
  ],
  cashier: ['pos:orders', 'pos:session', 'pos:read', 'loyalty:read'],
};

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
    console.log('Connected.\n');

    const [tenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = 'demo' AND "deletedAt" IS NULL LIMIT 1`,
    );
    if ((tenants as any[]).length === 0) {
      console.error('No demo tenant found.');
      process.exit(1);
    }
    const tenantId = (tenants as any[])[0].id;
    console.log(`Tenant: ${tenantId}`);

    // Upsert permissions
    const permissionIds: Record<string, number> = {};
    for (const p of PERMISSIONS) {
      await sequelize.query(
        `INSERT INTO public.permissions ("tenantId", module, action, description, "createdAt", "updatedAt")
         VALUES (:tenantId, :module, :action, :description, NOW(), NOW())
         ON CONFLICT ("tenantId", module, action) WHERE "deletedAt" IS NULL DO NOTHING`,
        {
          replacements: {
            tenantId,
            module: p.module,
            action: p.action,
            description: p.description,
          },
        },
      );
      const [rows] = await sequelize.query(
        `SELECT id FROM public.permissions WHERE "tenantId" = :tenantId AND module = :module AND action = :action AND "deletedAt" IS NULL`,
        { replacements: { tenantId, module: p.module, action: p.action } },
      );
      permissionIds[`${p.module}:${p.action}`] = (rows as any[])[0].id;
      console.log(
        `  Permission ${p.module}:${p.action} → id=${permissionIds[`${p.module}:${p.action}`]}`,
      );
    }

    // Assign to roles
    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
      const [roles] = await sequelize.query(
        `SELECT id FROM public.roles WHERE "tenantId" = :tenantId AND name = :name AND "deletedAt" IS NULL`,
        { replacements: { tenantId, name: roleName } },
      );
      if ((roles as any[]).length === 0) {
        console.log(`  Role '${roleName}' not found — skipping.`);
        continue;
      }
      const roleId = (roles as any[])[0].id;

      for (const key of permKeys) {
        const permId = permissionIds[key];
        if (!permId) {
          console.log(`  Permission ${key} not found — skipping.`);
          continue;
        }
        await sequelize.query(
          `INSERT INTO public."rolePermissions" ("tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
           VALUES (:tenantId, :roleId, :permId, NOW(), NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          { replacements: { tenantId, roleId, permId } },
        );
      }
      console.log(`  Role '${roleName}' → ${permKeys.length} permissions assigned.`);
    }

    console.log('\nWave 2 permissions seed complete.');
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
