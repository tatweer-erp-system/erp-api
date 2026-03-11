/**
 * Auth Seed Data
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/database/seeds/auth-seed.ts
 *
 * This script seeds a test tenant with a user, branch, and user_tenant_mapping
 * so the auth endpoints can be tested end-to-end.
 *
 * Test credentials:
 *   Email:    admin@acme-test.com
 *   Password: Admin@123!
 *   Tenant:   acme-test
 */

import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

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

    const tenantSlug = 'acme-test';
    const schemaName = `tenant_${tenantSlug}`;

    // 1. Check if tenant exists
    const [existingTenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL`,
      { replacements: { slug: tenantSlug } },
    );

    if ((existingTenants as any[]).length > 0) {
      console.log(`Tenant '${tenantSlug}' already exists. Skipping tenant creation.`);
    } else {
      // Create tenant
      const tenantId = uuidv4();
      await sequelize.query(
        `INSERT INTO public.tenants (id, name, slug, plan, is_active, settings, created_at, updated_at)
         VALUES (:id, :name, :slug, 'starter', true,
                 '{"logo": null}'::jsonb,
                 NOW(), NOW())`,
        { replacements: { id: tenantId, name: 'Acme Corporation', slug: tenantSlug } },
      );
      console.log(`Created tenant: ${tenantSlug}`);

      // Create schema
      await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      console.log(`Created schema: ${schemaName}`);
    }

    // Set search path
    await sequelize.query(`SET search_path = "${schemaName}", public`);

    // 2. Create tables if they don't exist (idempotent)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30),
        avatar_url VARCHAR(500),
        preferred_lang VARCHAR(5) DEFAULT 'en',
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMPTZ,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,
        role VARCHAR(100) DEFAULT 'employee',
        extra_permissions JSONB DEFAULT '[]'::jsonb,
        revoked_permissions JSONB DEFAULT '[]'::jsonb,
        created_by UUID,
        updated_by UUID,
        version INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        created_by UUID,
        updated_by UUID,
        version INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES "${schemaName}".users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES "${schemaName}".roles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        conditions JSONB,
        created_by UUID,
        updated_by UUID,
        version INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE(module, action)
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES "${schemaName}".roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES "${schemaName}".permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        address VARCHAR(500),
        phone VARCHAR(30),
        created_by UUID,
        updated_by UUID,
        version INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        user_id UUID,
        tenant_slug VARCHAR(100),
        ip_address VARCHAR(50),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_slug VARCHAR(100) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        family UUID NOT NULL,
        revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // user_tenant_mappings (public)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.user_tenant_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        tenant_slug VARCHAR(100) NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(email, tenant_slug)
      )
    `);

    // 3. Seed admin user
    const adminEmail = 'admin@acme-test.com';
    const adminPassword = 'Admin@123!';

    const [existingUsers] = await sequelize.query(
      `SELECT id FROM "${schemaName}".users WHERE email = :email AND deleted_at IS NULL`,
      { replacements: { email: adminEmail } },
    );

    let adminId: string;
    if ((existingUsers as any[]).length > 0) {
      adminId = (existingUsers as any[])[0].id;
      console.log(`Admin user already exists: ${adminEmail}`);
    } else {
      adminId = uuidv4();
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await sequelize.query(
        `INSERT INTO "${schemaName}".users
         (id, email, password_hash, first_name, last_name, role, is_active, preferred_lang, created_at, updated_at)
         VALUES (:id, :email, :passwordHash, :firstName, :lastName, 'admin', true, 'en', NOW(), NOW())`,
        {
          replacements: {
            id: adminId,
            email: adminEmail,
            passwordHash,
            firstName: 'Ahmed',
            lastName: 'Al-Rashidi',
          },
        },
      );
      console.log(`Created admin user: ${adminEmail}`);
    }

    // 4. Seed roles
    const [existingRoles] = await sequelize.query(
      `SELECT id FROM "${schemaName}".roles WHERE name = 'Admin' AND deleted_at IS NULL`,
    );

    let adminRoleId: string;
    if ((existingRoles as any[]).length > 0) {
      adminRoleId = (existingRoles as any[])[0].id;
      console.log('Admin role already exists.');
    } else {
      adminRoleId = uuidv4();
      const roles = [
        { id: adminRoleId, name: 'Admin', description: 'Full access', isSystem: true },
        { id: uuidv4(), name: 'Manager', description: 'Management access', isSystem: true },
        { id: uuidv4(), name: 'Employee', description: 'Basic employee access', isSystem: true },
        { id: uuidv4(), name: 'Cashier', description: 'POS cashier access', isSystem: true },
        { id: uuidv4(), name: 'Accountant', description: 'Financial access', isSystem: true },
      ];

      for (const role of roles) {
        await sequelize.query(
          `INSERT INTO "${schemaName}".roles (id, name, description, is_system, created_at, updated_at)
           VALUES (:id, :name, :description, :isSystem, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          {
            replacements: {
              id: role.id,
              name: role.name,
              description: role.description,
              isSystem: role.isSystem,
            },
          },
        );
      }
      console.log('Created roles.');
    }

    // 5. Assign admin role to user
    const [existingAssignment] = await sequelize.query(
      `SELECT id FROM "${schemaName}".user_roles WHERE user_id = :userId`,
      { replacements: { userId: adminId } },
    );

    if ((existingAssignment as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO "${schemaName}".user_roles (id, user_id, role_id, created_at, updated_at)
         VALUES (:id, :userId, :roleId, NOW(), NOW())`,
        { replacements: { id: uuidv4(), userId: adminId, roleId: adminRoleId } },
      );
      console.log('Assigned admin role to user.');
    }

    // 6. Seed branches
    const [existingBranches] = await sequelize.query(
      `SELECT id FROM "${schemaName}".branches WHERE deleted_at IS NULL`,
    );

    if ((existingBranches as any[]).length === 0) {
      const branches = [
        { id: uuidv4(), name: 'Headquarters', code: 'HQ', isDefault: true },
        { id: uuidv4(), name: 'Cairo Branch', code: 'CAI', isDefault: false },
      ];

      for (const branch of branches) {
        await sequelize.query(
          `INSERT INTO "${schemaName}".branches (id, name, code, is_default, is_active, created_at, updated_at)
           VALUES (:id, :name, :code, :isDefault, true, NOW(), NOW())`,
          {
            replacements: {
              id: branch.id,
              name: branch.name,
              code: branch.code,
              isDefault: branch.isDefault,
            },
          },
        );
      }
      console.log('Created branches.');
    }

    // 7. Create user_tenant_mapping
    const [existingMapping] = await sequelize.query(
      `SELECT id FROM public.user_tenant_mappings WHERE email = :email AND tenant_slug = :tenantSlug`,
      { replacements: { email: adminEmail, tenantSlug } },
    );

    if ((existingMapping as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO public.user_tenant_mappings (id, email, tenant_slug, user_id, created_at, updated_at)
         VALUES (:id, :email, :tenantSlug, :userId, NOW(), NOW())`,
        { replacements: { id: uuidv4(), email: adminEmail, tenantSlug, userId: adminId } },
      );
      console.log('Created user_tenant_mapping.');
    }

    console.log('\n--- Seed Complete ---');
    console.log(`Tenant slug: ${tenantSlug}`);
    console.log(`Email:       ${adminEmail}`);
    console.log(`Password:    ${adminPassword}`);
    console.log('\nTest with:');
    console.log(
      `  POST /api/v1/auth/login          { "email": "${adminEmail}", "password": "${adminPassword}" }`,
    );
    console.log(
      `  POST /api/v1/auth/${tenantSlug}/login  { "email": "${adminEmail}", "password": "${adminPassword}" }`,
    );
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
