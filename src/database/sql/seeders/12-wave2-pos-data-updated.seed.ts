/**
 * Wave 2 — Updated Seed Data (post-QA)
 *
 * Includes everything from wave-2-seed.ts PLUS:
 *   - Wave 2 permissions inserted into public.permissions
 *   - Role-permission assignments for super_admin, manager, cashier
 *   - Missing updatedBy columns on 4 tables
 *   - Critical missing indexes
 *
 * Idempotent: checks existence before inserting.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/seeds/wave-2-seed-updated.ts
 */

import { Sequelize } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    console.log('Connected to database.\n');

    // ════════════════════════════════════════════════════════════════════════
    // 0. SCHEMA FIXES — Add missing columns (idempotent)
    // ════════════════════════════════════════════════════════════════════════
    console.log('=== 0. Schema Fixes ===');

    const columnsToAdd = [
      { table: 'gift_cards', column: 'updatedBy', type: 'UUID' },
      { table: 'cash_movements', column: 'updatedBy', type: 'UUID' },
      { table: 'pos_held_orders', column: 'updatedBy', type: 'UUID' },
      { table: 'pos_refunds', column: 'updatedBy', type: 'UUID' },
    ];

    for (const col of columnsToAdd) {
      const [existing] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = :table AND column_name = :column`,
        { replacements: { table: col.table, column: col.column } },
      );
      if ((existing as any[]).length === 0) {
        await sequelize.query(
          `ALTER TABLE public.${col.table} ADD COLUMN "${col.column}" ${col.type}`,
        );
        console.log(`  Added ${col.column} to ${col.table}`);
      } else {
        console.log(`  ${col.table}.${col.column} already exists`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 0b. MISSING INDEXES (idempotent — IF NOT EXISTS)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 0b. Missing Indexes ===');

    const indexes = [
      {
        name: 'idx_pos_sessions_tenant_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_pos_sessions_tenant_status ON public.pos_sessions ("tenantId", status)',
      },
      {
        name: 'idx_pos_sessions_branchId',
        sql: 'CREATE INDEX IF NOT EXISTS idx_pos_sessions_branchId ON public.pos_sessions ("branchId")',
      },
      {
        name: 'idx_pos_orders_session_status',
        sql: 'CREATE INDEX IF NOT EXISTS idx_pos_orders_session_status ON public.pos_orders ("sessionId", status)',
      },
      {
        name: 'idx_pos_orders_table_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_pos_orders_table_id ON public.pos_orders ("tableId")',
      },
      {
        name: 'idx_loyalty_accounts_program_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_program_id ON public.loyalty_accounts ("programId")',
      },
      {
        name: 'idx_loyalty_transactions_order_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON public.loyalty_transactions ("orderId")',
      },
      {
        name: 'idx_voucher_redemptions_voucher_customer',
        sql: 'CREATE INDEX IF NOT EXISTS idx_voucher_redemptions_voucher_customer ON public.voucher_redemptions ("voucherId", "customerId")',
      },
      {
        name: 'idx_pos_order_items_order_course',
        sql: 'CREATE INDEX IF NOT EXISTS idx_pos_order_items_order_course ON public.pos_order_items ("orderId", course)',
      },
      {
        name: 'idx_loyalty_programs_tenant_active',
        sql: 'CREATE INDEX IF NOT EXISTS idx_loyalty_programs_tenant_active ON public.loyalty_programs ("tenantId", "isActive")',
      },
      {
        name: 'idx_loyalty_tiers_program_points',
        sql: 'CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_program_points ON public.loyalty_tiers ("programId", "minPoints")',
      },
      {
        name: 'idx_vouchers_tenant_active',
        sql: 'CREATE INDEX IF NOT EXISTS idx_vouchers_tenant_active ON public.vouchers ("tenantId", "isActive")',
      },
      {
        name: 'idx_gift_card_transactions_order_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_order_id ON public.gift_card_transactions ("orderId")',
      },
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(idx.sql);
        console.log(`  Index ${idx.name}: OK`);
      } catch (e: any) {
        console.log(`  Index ${idx.name}: SKIP (${e.message?.substring(0, 60)})`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. GET EXISTING TENANT & BRANCH
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 1. Tenant & Branch ===');
    const [tenants] = await sequelize.query(
      `SELECT id, slug FROM public.tenants WHERE slug = 'demo' AND "deletedAt" IS NULL LIMIT 1`,
    );
    if ((tenants as any[]).length === 0) {
      console.error('No tenant found. Run demo-tenant seed first.');
      process.exit(1);
    }
    const tenantId = (tenants as any[])[0].id;
    const tenantSlug = (tenants as any[])[0].slug;
    console.log(`  Tenant: ${tenantSlug} (${tenantId})`);

    const [branches] = await sequelize.query(
      `SELECT id FROM public.branches WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
      { replacements: { tenantId } },
    );
    if ((branches as any[]).length === 0) {
      console.error('No branch found for tenant.');
      process.exit(1);
    }
    const branchId = (branches as any[])[0].id;
    console.log(`  Branch: ${branchId}`);

    // Get admin user for created_by
    const [admins] = await sequelize.query(
      `SELECT id FROM public.users WHERE "tenantId" = :tenantId AND email = 'admin@demo.com' AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { tenantId } },
    );
    const adminId = (admins as any[]).length > 0 ? (admins as any[])[0].id : null;

    // ════════════════════════════════════════════════════════════════════════
    // 1b. WAVE 2 PERMISSIONS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 1b. Wave 2 Permissions ===');

    const wave2Permissions = [
      {
        key: 'pos:orders',
        module: 'pos',
        action: 'orders',
        description: 'Create, view, and manage POS orders',
      },
      {
        key: 'pos:session',
        module: 'pos',
        action: 'session',
        description: 'Open and close POS sessions',
      },
      {
        key: 'pos:manage',
        module: 'pos',
        action: 'manage',
        description: 'Manage POS terminals and settings',
      },
      {
        key: 'pos:read',
        module: 'pos',
        action: 'read',
        description: 'View POS data (sessions, terminals, overrides)',
      },
      {
        key: 'pos:admin',
        module: 'pos',
        action: 'admin',
        description: 'Manage cashier profiles and PINs',
      },
      {
        key: 'loyalty:manage',
        module: 'loyalty',
        action: 'manage',
        description: 'Manage loyalty programs, tiers, and point adjustments',
      },
      {
        key: 'loyalty:read',
        module: 'loyalty',
        action: 'read',
        description: 'View loyalty accounts and transaction history',
      },
      {
        key: 'vouchers:manage',
        module: 'vouchers',
        action: 'manage',
        description: 'Create and manage vouchers and gift cards',
      },
    ];

    const permissionIds: Record<string, string> = {};

    for (const perm of wave2Permissions) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.permissions WHERE key = :key`,
        { replacements: { key: perm.key } },
      );

      if ((existing as any[]).length > 0) {
        permissionIds[perm.key] = (existing as any[])[0].id;
        console.log(`  Permission '${perm.key}' already exists.`);
      } else {
        const permId = uuidv7();
        permissionIds[perm.key] = permId;
        await sequelize.query(
          `INSERT INTO public.permissions (id, key, module, action, description, "createdAt", "updatedAt")
           VALUES (:id, :key, :module, :action, :description, NOW(), NOW())`,
          {
            replacements: {
              id: permId,
              key: perm.key,
              module: perm.module,
              action: perm.action,
              description: perm.description,
            },
          },
        );
        console.log(`  Created permission: ${perm.key}`);
      }
    }

    // Assign permissions to roles
    console.log('\n  --- Role-Permission Assignments ---');

    // Get role IDs
    const [roles] = await sequelize.query(
      `SELECT id, name FROM public.roles WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );
    const roleMap: Record<string, string> = {};
    for (const role of roles as any[]) {
      roleMap[role.name] = role.id;
    }

    // super_admin gets ALL permissions
    // manager gets ALL permissions
    // cashier gets: pos:orders, pos:session, pos:read, loyalty:read
    const rolePermissionMap: Record<string, string[]> = {
      super_admin: Object.keys(permissionIds),
      manager: Object.keys(permissionIds),
      cashier: ['pos:orders', 'pos:session', 'pos:read', 'loyalty:read'],
    };

    for (const [roleName, permKeys] of Object.entries(rolePermissionMap)) {
      const roleId = roleMap[roleName];
      if (!roleId) {
        console.log(`  Role '${roleName}' not found — skipping.`);
        continue;
      }

      for (const permKey of permKeys) {
        const permId = permissionIds[permKey];
        if (!permId) continue;

        await sequelize.query(
          `INSERT INTO public.rolePermissions ("roleId", "permissionId", "createdAt", "updatedAt")
           VALUES (:roleId, :permId, NOW(), NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING`,
          { replacements: { roleId, permId } },
        );
      }
      console.log(`  ${roleName}: assigned ${permKeys.length} permissions`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. WAREHOUSE — set allow_negative_stock = false
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 2. Warehouse ===');
    const [warehouses] = await sequelize.query(
      `SELECT id FROM public.warehouses WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
      { replacements: { tenantId } },
    );
    if ((warehouses as any[]).length === 0) {
      console.error('No warehouse found for tenant.');
      process.exit(1);
    }
    const warehouseId = (warehouses as any[])[0].id;
    await sequelize.query(
      `UPDATE public.warehouses SET "allowNegativeStock" = false WHERE id = :id`,
      { replacements: { id: warehouseId } },
    );
    console.log(`  Warehouse: ${warehouseId} ("allowNegativeStock" = false)`);

    // ════════════════════════════════════════════════════════════════════════
    // 3. POS_ORDER SEQUENCE
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 3. POS Order Sequence ===');
    const [existingSeq] = await sequelize.query(
      `SELECT id FROM public.sequences WHERE "tenantId" = :tenantId AND entity = 'pos_order' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );
    if ((existingSeq as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO public.sequences (id, "tenantId", "branchId", entity, prefix, padding, "lastValue", "resetCycle", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, NULL, 'pos_order', 'POS', 5, 0, 'never', NOW(), NOW())`,
        { replacements: { id: uuidv7(), tenantId } },
      );
      console.log('  Created pos_order sequence (POS-xxxxx)');
    } else {
      console.log('  pos_order sequence already exists.');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. PRODUCTS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 4. Products ===');
    const productData = [
      {
        sku: 'BURGER-001',
        name: { en: 'Burger', ar: 'برجر' },
        desc: { en: 'Classic beef burger', ar: 'برجر لحم كلاسيكي' },
        barcode: '6281100000001',
        productType: 'storable',
        canBeSold: true,
        invoicePolicy: 'ordered',
        price: 35.0,
        cost: 15.0,
        tax: 15,
        stock: 10,
      },
      {
        sku: 'DRINK-001',
        name: { en: 'Soft Drink', ar: 'مشروب غازي' },
        desc: { en: 'Carbonated soft drink', ar: 'مشروب غازي' },
        barcode: '6281100000002',
        productType: 'consumable',
        canBeSold: true,
        invoicePolicy: 'ordered',
        price: 10.0,
        cost: 3.0,
        tax: 15,
        stock: null,
      },
      {
        sku: 'DELIVERY-001',
        name: { en: 'Delivery Service', ar: 'خدمة التوصيل' },
        desc: { en: 'Delivery service', ar: 'خدمة التوصيل' },
        barcode: '6281100000003',
        productType: 'service',
        canBeSold: true,
        invoicePolicy: 'ordered',
        price: 15.0,
        cost: null,
        tax: 15,
        stock: null,
      },
      {
        sku: 'SPECIAL-BURGER-001',
        name: { en: 'Special Burger', ar: 'برجر خاص' },
        desc: { en: 'Premium special burger', ar: 'برجر خاص فاخر' },
        barcode: '6281100000004',
        productType: 'storable',
        canBeSold: true,
        invoicePolicy: 'ordered',
        price: 50.0,
        cost: 25.0,
        tax: 15,
        stock: 2,
      },
    ];

    const productIds: Record<string, string> = {};

    for (const prod of productData) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.products WHERE "tenantId" = :tenantId AND sku = :sku AND "deletedAt" IS NULL`,
        { replacements: { tenantId, sku: prod.sku } },
      );

      if ((existing as any[]).length > 0) {
        productIds[prod.sku] = (existing as any[])[0].id;
        await sequelize.query(
          `UPDATE public.products SET "productType" = :productType, "canBeSold" = :canBeSold, "invoicePolicy" = :invoicePolicy WHERE id = :id`,
          {
            replacements: {
              id: productIds[prod.sku],
              productType: prod.productType,
              canBeSold: prod.canBeSold,
              invoicePolicy: prod.invoicePolicy,
            },
          },
        );
        console.log(`  Product '${prod.sku}' already exists — updated types.`);
      } else {
        const prodId = uuidv7();
        productIds[prod.sku] = prodId;
        await sequelize.query(
          `INSERT INTO public.products
           (id, "tenantId", name, description, sku, barcode, "unitPrice", "costPrice",
            currency, "unitOfMeasure", "taxRate", "isActive", "productType", "invoicePolicy", "canBeSold",
            "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :name::jsonb, :desc::jsonb, :sku, :barcode, :price, :cost,
                   'SAR', 'pcs', :tax, true, :productType, :invoicePolicy, :canBeSold,
                   :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: prodId,
              tenantId,
              name: JSON.stringify(prod.name),
              desc: JSON.stringify(prod.desc),
              sku: prod.sku,
              barcode: prod.barcode,
              price: prod.price,
              cost: prod.cost,
              tax: prod.tax,
              productType: prod.productType,
              invoicePolicy: prod.invoicePolicy,
              canBeSold: prod.canBeSold,
              createdBy: adminId,
            },
          },
        );
        console.log(`  Created product: ${prod.name.en} (${prod.sku})`);
      }

      // Stock levels for storable products
      if (prod.stock !== null) {
        const [existingStock] = await sequelize.query(
          `SELECT id FROM public.stock_levels WHERE "tenantId" = :tenantId AND "productId" = :prodId AND "warehouseId" = :whId`,
          { replacements: { tenantId, prodId: productIds[prod.sku], whId: warehouseId } },
        );

        if ((existingStock as any[]).length > 0) {
          await sequelize.query(
            `UPDATE public.stock_levels SET quantity = :qty WHERE "productId" = :prodId AND "warehouseId" = :whId AND "tenantId" = :tenantId`,
            {
              replacements: {
                qty: prod.stock,
                prodId: productIds[prod.sku],
                whId: warehouseId,
                tenantId,
              },
            },
          );
          console.log(`    Stock reset: ${prod.sku} -> ${prod.stock} units`);
        } else {
          await sequelize.query(
            `INSERT INTO public.stock_levels ("tenantId", "productId", "warehouseId", quantity, "reservedQuantity", "createdAt", "updatedAt")
             VALUES (:tenantId, :prodId, :whId, :qty, 0, NOW(), NOW())`,
            {
              replacements: {
                tenantId,
                prodId: productIds[prod.sku],
                whId: warehouseId,
                qty: prod.stock,
              },
            },
          );
          console.log(`    Created stock: ${prod.sku} -> ${prod.stock} units`);
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. USERS & CASHIERS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 5. Users & Cashiers ===');
    const defaultHash = await bcrypt.hash('Demo@1234', 10);

    const cashierData = [
      {
        email: 'cashier1@test.com',
        first: 'Ahmed',
        last: 'Al-Rashidi',
        displayName: 'Ahmed Al-Rashidi',
        pin: '1234',
        maxDiscountPct: 10,
        canRefund: true,
        canVoid: true,
      },
      {
        email: 'cashier2@test.com',
        first: 'Sara',
        last: 'Al-Otaibi',
        displayName: 'Sara Al-Otaibi',
        pin: '5678',
        maxDiscountPct: 5,
        canRefund: false,
        canVoid: false,
      },
      {
        email: 'manager@test.com',
        first: 'Khalid',
        last: 'Al-Dosari',
        displayName: 'Khalid Al-Dosari',
        pin: '9999',
        maxDiscountPct: 100,
        canRefund: true,
        canVoid: true,
      },
    ];

    const userIds: Record<string, string> = {};

    // Get super_admin role for POS permissions
    const superAdminRoleId = roleMap['super_admin'] ?? null;

    for (const c of cashierData) {
      // Create or find user
      const [existingUser] = await sequelize.query(
        `SELECT id FROM public.users WHERE email = :email AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
        { replacements: { email: c.email, tenantId } },
      );

      let userId: string;
      if ((existingUser as any[]).length > 0) {
        userId = (existingUser as any[])[0].id;
        console.log(`  User '${c.email}' already exists.`);
      } else {
        userId = uuidv7();
        await sequelize.query(
          `INSERT INTO public.users
           (id, "tenantId", email, "passwordHash", "firstName", "lastName", "isActive", "preferredLang", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :email, :hash, :first, :last, true, 'en', NOW(), NOW())`,
          {
            replacements: {
              id: userId,
              tenantId,
              email: c.email,
              hash: defaultHash,
              first: c.first,
              last: c.last,
            },
          },
        );
        console.log(`  Created user: ${c.email}`);
      }
      userIds[c.email] = userId;

      // User-tenant mapping
      const [existMap] = await sequelize.query(
        `SELECT id FROM public.user_tenant_mappings WHERE email = :email AND "tenantId" = :tenantId`,
        { replacements: { email: c.email, tenantId } },
      );
      if ((existMap as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO public.user_tenant_mappings (id, email, "tenantId", "userId", "tenantSlug", "createdAt", "updatedAt")
           VALUES (:id, :email, :tenantId, :userId, :slug, NOW(), NOW())
           ON CONFLICT (email, "tenantId") DO NOTHING`,
          {
            replacements: {
              id: uuidv7(),
              email: c.email,
              tenantId,
              userId,
              slug: tenantSlug,
            },
          },
        );
      }

      // Assign super_admin role for full permissions
      if (superAdminRoleId) {
        await sequelize.query(
          `INSERT INTO public.user_roles ("tenantId", "userId", "roleId", "createdAt", "updatedAt")
           VALUES (:tenantId, :userId, :roleId, NOW(), NOW())
           ON CONFLICT ("userId", "roleId") DO NOTHING`,
          { replacements: { tenantId, userId, roleId: superAdminRoleId } },
        );
      }

      // Create or update cashier profile
      const pinHash = await bcrypt.hash(c.pin, 10);
      const [existingCashier] = await sequelize.query(
        `SELECT id FROM public.pos_cashiers WHERE "tenantId" = :tenantId AND "userId" = :userId AND "deletedAt" IS NULL`,
        { replacements: { tenantId, userId } },
      );

      if ((existingCashier as any[]).length > 0) {
        await sequelize.query(
          `UPDATE public.pos_cashiers
           SET "pinHash" = :pinHash, "displayName" = :displayName, "maxDiscountPct" = :maxDiscount,
               "canRefund" = :canRefund, "canVoid" = :canVoid, "isActive" = true,
               "failedPinAttempts" = 0, "lockedUntil" = NULL
           WHERE "tenantId" = :tenantId AND "userId" = :userId AND "deletedAt" IS NULL`,
          {
            replacements: {
              pinHash,
              displayName: c.displayName,
              maxDiscount: c.maxDiscountPct,
              canRefund: c.canRefund,
              canVoid: c.canVoid,
              tenantId,
              userId,
            },
          },
        );
        console.log(`  Cashier '${c.displayName}' updated (PIN reset, lockout cleared).`);
      } else {
        await sequelize.query(
          `INSERT INTO public.pos_cashiers
           (id, "tenantId", "userId", "pinHash", "displayName", "isActive", "maxDiscountPct", "canRefund", "canVoid", "canOpenDrawer",
            "failedPinAttempts", "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :userId, :pinHash, :displayName, true, :maxDiscount, :canRefund, :canVoid, true,
                   0, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv7(),
              tenantId,
              userId,
              pinHash,
              displayName: c.displayName,
              maxDiscount: c.maxDiscountPct,
              canRefund: c.canRefund,
              canVoid: c.canVoid,
              createdBy: adminId,
            },
          },
        );
        console.log(`  Created cashier: ${c.displayName}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. TERMINAL
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 6. Terminal ===');
    const [existingTerminal] = await sequelize.query(
      `SELECT id FROM public.pos_terminals WHERE "tenantId" = :tenantId AND name = 'Terminal 1' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    let terminalId: string;
    if ((existingTerminal as any[]).length > 0) {
      terminalId = (existingTerminal as any[])[0].id;
      console.log(`  Terminal 'Terminal 1' already exists.`);
    } else {
      terminalId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.pos_terminals
         (id, "tenantId", "branchId", name, "isActive", settings, "createdBy", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :branchId, 'Terminal 1', true,
                 :settings::jsonb, :createdBy, NOW(), NOW())`,
        {
          replacements: {
            id: terminalId,
            tenantId,
            branchId,
            settings: JSON.stringify({
              receipt_printer: '192.168.1.100',
              cash_drawer_port: 'COM1',
            }),
            createdBy: adminId,
          },
        },
      );
      console.log(`  Created terminal: Terminal 1`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. LOYALTY PROGRAM + TIERS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 7. Loyalty Program ===');
    const [existingProgram] = await sequelize.query(
      `SELECT id FROM public.loyalty_programs WHERE "tenantId" = :tenantId AND name = 'Star Rewards' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    let programId: string;
    if ((existingProgram as any[]).length > 0) {
      programId = (existingProgram as any[])[0].id;
      console.log(`  Loyalty program 'Star Rewards' already exists.`);
    } else {
      programId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.loyalty_programs
         (id, "tenantId", name, "isActive", "pointsPerCurrency", "currencyPerPoint",
          "expiryDays", "minRedeemPoints", "maxRedeemPct", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'Star Rewards', true, 1, 0.05,
                 365, 100, 20, NOW(), NOW())`,
        { replacements: { id: programId, tenantId } },
      );
      console.log(`  Created loyalty program: Star Rewards`);
    }

    // Tiers
    const tierData = [
      { name: 'Silver', minPoints: 0, earnMul: 1.0, redeemMul: 1.0, sort: 0 },
      { name: 'Gold', minPoints: 500, earnMul: 1.5, redeemMul: 1.2, sort: 1 },
      { name: 'Platinum', minPoints: 2000, earnMul: 2.0, redeemMul: 1.5, sort: 2 },
    ];

    for (const tier of tierData) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.loyalty_tiers WHERE "programId" = :programId AND name = :name`,
        { replacements: { programId, name: tier.name } },
      );
      if ((existing as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO public.loyalty_tiers
           ("programId", name, "minPoints", "earnMultiplier", "redeemMultiplier", "sortOrder", "createdAt")
           VALUES (:programId, :name, :minPoints, :earnMul, :redeemMul, :sort, NOW())`,
          {
            replacements: {
              programId,
              name: tier.name,
              minPoints: tier.minPoints,
              earnMul: tier.earnMul,
              redeemMul: tier.redeemMul,
              sort: tier.sort,
            },
          },
        );
        console.log(`  Created tier: ${tier.name}`);
      } else {
        console.log(`  Tier '${tier.name}' already exists.`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. CUSTOMER CONTACT
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 8. Customer Contact ===');
    const [existingContact] = await sequelize.query(
      `SELECT id FROM public.contacts WHERE "tenantId" = :tenantId AND email = 'faisal@test.com' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    let customerId: string;
    if ((existingContact as any[]).length > 0) {
      customerId = (existingContact as any[])[0].id;
      console.log(`  Customer 'faisal@test.com' already exists.`);
    } else {
      customerId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.contacts
         (id, "tenantId", "firstName", "lastName", email, phone, status, "createdBy", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'Faisal', 'Al-Harbi', 'faisal@test.com', '+966501234567', 'active', :createdBy, NOW(), NOW())`,
        { replacements: { id: customerId, tenantId, createdBy: adminId } },
      );
      console.log(`  Created customer: Faisal Al-Harbi`);
    }

    // Loyalty account with 200 points
    const [existingAccount] = await sequelize.query(
      `SELECT id, "currentPoints" FROM public.loyalty_accounts WHERE "customerId" = :customerId AND "programId" = :programId`,
      { replacements: { customerId, programId } },
    );

    let accountId: string;
    if ((existingAccount as any[]).length > 0) {
      accountId = (existingAccount as any[])[0].id;
      await sequelize.query(
        `UPDATE public.loyalty_accounts SET "currentPoints" = 200, "lifetimePoints" = 200, version = version + 1 WHERE id = :id`,
        { replacements: { id: accountId } },
      );
      console.log(`  Loyalty account reset to 200 points.`);
    } else {
      accountId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.loyalty_accounts
         (id, "tenantId", "customerId", "programId", "currentPoints", "lifetimePoints", "enrolledAt", "lastActivityAt", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :customerId, :programId, 200, 200, NOW(), NOW(), 0, NOW(), NOW())`,
        {
          replacements: { id: accountId, tenantId, customerId, programId },
        },
      );
      console.log(`  Created loyalty account with 200 points.`);
    }

    // Record manual grant transaction
    const [existingManualGrant] = await sequelize.query(
      `SELECT id FROM public.loyalty_transactions WHERE "accountId" = :accountId AND type = 'manual' AND points = 200`,
      { replacements: { accountId } },
    );
    if ((existingManualGrant as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO public.loyalty_transactions
         (id, "accountId", type, points, "balanceAfter", description, "createdAt")
         VALUES (:id, :accountId, 'manual', 200, 200, '[grant] Wave 2 seed initial points', NOW())`,
        { replacements: { id: uuidv7(), accountId } },
      );
      console.log(`  Recorded manual grant transaction.`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. VOUCHER: SAVE10
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 9. Voucher ===');
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [existingVoucher] = await sequelize.query(
      `SELECT id FROM public.vouchers WHERE "tenantId" = :tenantId AND code = 'SAVE10' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    if ((existingVoucher as any[]).length > 0) {
      await sequelize.query(
        `UPDATE public.vouchers SET "usedCount" = 0, "isActive" = true, "validFrom" = :validFrom, "validUntil" = :validUntil WHERE code = 'SAVE10' AND "tenantId" = :tenantId`,
        { replacements: { tenantId, validFrom: today, validUntil } },
      );
      console.log(`  Voucher 'SAVE10' already exists — reset.`);
    } else {
      await sequelize.query(
        `INSERT INTO public.vouchers
         (id, "tenantId", code, name, type, "discountType", "discountValue", "minOrderAmount", "maxDiscountAmount",
          "maxUses", "maxUsesPerCustomer", "usedCount", "validFrom", "validUntil", "isActive", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'SAVE10', '10% Off', 'discount', 'percent', 10, 50, 20,
                 100, 100, 0, :validFrom, :validUntil, true, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv7(),
            tenantId,
            validFrom: today,
            validUntil,
          },
        },
      );
      console.log(`  Created voucher: SAVE10 (10% off, cap 20 SAR, min 50 SAR)`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10. GIFT CARD
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 10. Gift Card ===');
    const [existingGC] = await sequelize.query(
      `SELECT id, code, "currentBalance" FROM public.gift_cards WHERE "tenantId" = :tenantId AND "initialBalance" = 30 AND "deletedAt" IS NULL LIMIT 1`,
      { replacements: { tenantId } },
    );

    let giftCardCode: string;
    if ((existingGC as any[]).length > 0) {
      giftCardCode = (existingGC as any[])[0].code;
      await sequelize.query(
        `UPDATE public.gift_cards SET "currentBalance" = 30, "isActive" = true WHERE id = :id`,
        { replacements: { id: (existingGC as any[])[0].id } },
      );
      console.log(`  Gift card already exists: ${giftCardCode} — balance reset to 30.00 SAR`);
    } else {
      giftCardCode = 'GC-WAVE2-TEST01';
      await sequelize.query(
        `INSERT INTO public.gift_cards
         (id, "tenantId", code, "initialBalance", "currentBalance", currency, "isActive", "issuedBy", "issuedAt", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :code, 30, 30, 'SAR', true, :issuedBy, NOW(), NOW(), NOW())`,
        {
          replacements: {
            id: uuidv7(),
            tenantId,
            code: giftCardCode,
            issuedBy: adminId,
          },
        },
      );
      console.log(`  Created gift card: ${giftCardCode} (30.00 SAR)`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLEAN UP: Close any stale open sessions
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== Cleanup ===');
    const [openSessions] = await sequelize.query(
      `UPDATE public.pos_sessions SET status = 'closed', "closedAt" = NOW()
       WHERE "tenantId" = :tenantId AND status = 'open'
       RETURNING id`,
      { replacements: { tenantId } },
    );
    if ((openSessions as any[]).length > 0) {
      console.log(`  Closed ${(openSessions as any[]).length} stale open session(s).`);
    }

    // Clean up held orders
    await sequelize.query(`DELETE FROM public.pos_held_orders WHERE "tenantId" = :tenantId`, {
      replacements: { tenantId },
    });

    // ════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('Wave 2 Updated Seed Complete!');
    console.log('='.repeat(60));
    console.log(`Tenant:          ${tenantSlug} (${tenantId})`);
    console.log(`Branch:          ${branchId}`);
    console.log(`Warehouse:       ${warehouseId}`);
    console.log(`Terminal:        ${terminalId}`);
    console.log(`Products:        Burger, Soft Drink, Delivery Service, Special Burger`);
    console.log(
      `Cashiers:        cashier1@test.com (1234), cashier2@test.com (5678), manager@test.com (9999)`,
    );
    console.log(`Customer:        Faisal Al-Harbi (${customerId}) — 200 loyalty points`);
    console.log(`Voucher:         SAVE10 (10% off, cap 20 SAR)`);
    console.log(`Gift Card:       ${giftCardCode} (30.00 SAR)`);
    console.log(`Loyalty Program: Star Rewards (Silver/Gold/Platinum)`);
    console.log(`Permissions:     8 Wave 2 permissions seeded + role assignments`);
    console.log(`Indexes:         12 missing indexes created`);
    console.log(`Schema Fixes:    4 missing updatedBy columns added`);

    // Output IDs for test runner
    const seedOutput = {
      tenantId,
      tenantSlug,
      branchId,
      warehouseId,
      terminalId,
      productIds,
      userIds,
      customerId,
      accountId,
      programId,
      giftCardCode,
    };
    console.log('\n--- SEED_OUTPUT_JSON ---');
    console.log(JSON.stringify(seedOutput));
    console.log('--- END_SEED_OUTPUT ---');
  } catch (error) {
    console.error('Wave 2 updated seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
