import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

// ── IDs from 02-demo-tenant ─────────────────────────────────────────────────
const TENANT_IDS = [
  '10000000-0000-4000-a000-000000000001',
  '10000000-0000-4000-a000-000000000002',
  '10000000-0000-4000-a000-000000000003',
  '10000000-0000-4000-a000-000000000004',
  '10000000-0000-4000-a000-000000000005',
  '10000000-0000-4000-a000-000000000006',
  '10000000-0000-4000-a000-000000000007',
  '10000000-0000-4000-a000-000000000008',
  '10000000-0000-4000-a000-000000000009',
  '10000000-0000-4000-a000-000000000010',
];

const TENANT_SLUGS = [
  'demo-company',
  'alpha-trading',
  'beta-tech',
  'gamma-restaurant',
  'delta-retail',
  'epsilon-services',
  'zeta-construction',
  'eta-healthcare',
  'theta-education',
  'iota-logistics',
];

// ── Stable User IDs for cross-seeder references (3 per tenant = 30) ─────────
// Format: 2000000T-0000-4000-a000-00000000000U
// T = tenant index (1-based, hex A for 10), U = user index within tenant (1-3)
// Tenant 1 keeps original IDs for backward compat with seeders 05-15
const USER_IDS: string[][] = [
  [
    '20000000-0000-4000-a000-000000000001',
    '20000000-0000-4000-a000-000000000002',
    '20000000-0000-4000-a000-000000000003',
  ],
];
for (let t = 1; t < 10; t++) {
  const tHex = (t + 1).toString(16).toUpperCase();
  USER_IDS.push([
    `2000000${tHex}-0000-4000-a000-000000000001`,
    `2000000${tHex}-0000-4000-a000-000000000002`,
    `2000000${tHex}-0000-4000-a000-000000000003`,
  ]);
}

// ── 30 Admins ───────────────────────────────────────────────────────────────
const ADMIN_SUPER_ID = '00000000-0000-4000-a000-000000000001'; // seeded by migration
const adminNames = [
  { first: 'Fahad', last: 'Al-Otaibi', role: 'admin' },
  { first: 'Noura', last: 'Al-Zahrani', role: 'admin' },
  { first: 'Tariq', last: 'Al-Ghamdi', role: 'admin' },
  { first: 'Huda', last: 'Al-Qahtani', role: 'admin' },
  { first: 'Sultan', last: 'Al-Shehri', role: 'admin' },
  { first: 'Lama', last: 'Al-Mutairi', role: 'admin' },
  { first: 'Nawaf', last: 'Al-Harbi', role: 'admin' },
  { first: 'Reema', last: 'Al-Dosari', role: 'admin' },
  { first: 'Badr', last: 'Al-Yami', role: 'admin' },
  { first: 'Dalal', last: 'Al-Subaie', role: 'support' },
  { first: 'Faisal', last: 'Al-Rashidi', role: 'support' },
  { first: 'Maha', last: 'Al-Tamimi', role: 'support' },
  { first: 'Sami', last: 'Al-Juhani', role: 'support' },
  { first: 'Amal', last: 'Al-Shamrani', role: 'support' },
  { first: 'Nayef', last: 'Al-Enezi', role: 'support' },
  { first: 'Rawan', last: 'Al-Dossary', role: 'support' },
  { first: 'Hamad', last: 'Al-Ajmi', role: 'support' },
  { first: 'Sahar', last: 'Al-Kahtani', role: 'viewer' },
  { first: 'Turki', last: 'Al-Blowi', role: 'viewer' },
  { first: 'Asma', last: 'Al-Asmari', role: 'viewer' },
  { first: 'Mishaal', last: 'Al-Anazi', role: 'viewer' },
  { first: 'Latifa', last: 'Al-Sulaimani', role: 'viewer' },
  { first: 'Khalid', last: 'Al-Malki', role: 'viewer' },
  { first: 'Haifa', last: 'Al-Othmani', role: 'admin' },
  { first: 'Ziad', last: 'Al-Thubaiti', role: 'admin' },
  { first: 'Nada', last: 'Al-Ruwaily', role: 'admin' },
  { first: 'Mansour', last: 'Al-Faifi', role: 'support' },
  { first: 'Wafa', last: 'Al-Garni', role: 'support' },
  { first: 'Abdulaziz', last: 'Al-Mohammadi', role: 'admin' },
  { first: 'Mariam', last: 'Al-Bogami', role: 'admin' },
];

// User names per tenant (manager, cashier, employee)
const userNames = [
  // T1 demo-company
  [
    { first: 'Ahmed', last: 'Al-Rashid', email: 'manager@demo.com', lang: 'ar' },
    { first: 'Sara', last: 'Hassan', email: 'cashier@demo.com', lang: 'ar' },
    { first: 'Mohammed', last: 'Ali', email: 'employee@demo.com', lang: 'en' },
  ],
  // T2 alpha-trading
  [
    { first: 'Omar', last: 'Al-Khaldi', email: 'omar@alpha-trading.com', lang: 'ar' },
    { first: 'Layla', last: 'Nasser', email: 'layla@alpha-trading.com', lang: 'ar' },
    { first: 'Youssef', last: 'Ibrahim', email: 'youssef@alpha-trading.com', lang: 'en' },
  ],
  // T3 beta-tech
  [
    { first: 'Hassan', last: 'Al-Farsi', email: 'hassan@beta-tech.com', lang: 'en' },
    { first: 'Noor', last: 'Khalil', email: 'noor@beta-tech.com', lang: 'en' },
    { first: 'Ali', last: 'Saeed', email: 'ali@beta-tech.com', lang: 'ar' },
  ],
  // T4 gamma-restaurant
  [
    { first: 'Saud', last: 'Al-Otaibi', email: 'saud@gamma-restaurant.com', lang: 'ar' },
    { first: 'Reem', last: 'Al-Harbi', email: 'reem@gamma-restaurant.com', lang: 'ar' },
    { first: 'Abdulrahman', last: 'Al-Sahli', email: 'abdul@gamma-restaurant.com', lang: 'ar' },
  ],
  // T5 delta-retail
  [
    { first: 'Faisal', last: 'Al-Dosari', email: 'faisal@delta-retail.com', lang: 'ar' },
    { first: 'Mona', last: 'Al-Qahtani', email: 'mona@delta-retail.com', lang: 'ar' },
    { first: 'Khaled', last: 'Al-Shammari', email: 'khaled@delta-retail.com', lang: 'en' },
  ],
  // T6 epsilon-services
  [
    { first: 'Bandar', last: 'Al-Zahrani', email: 'bandar@epsilon-services.com', lang: 'ar' },
    { first: 'Hessa', last: 'Al-Mutairi', email: 'hessa@epsilon-services.com', lang: 'ar' },
    { first: 'Tamer', last: 'Emad', email: 'tamer@epsilon-services.com', lang: 'en' },
  ],
  // T7 zeta-construction
  [
    { first: 'Saad', last: 'Al-Ghamdi', email: 'saad@zeta-construction.com', lang: 'ar' },
    { first: 'Aisha', last: 'Al-Shehri', email: 'aisha@zeta-construction.com', lang: 'ar' },
    { first: 'Waleed', last: 'Al-Anazi', email: 'waleed@zeta-construction.com', lang: 'ar' },
  ],
  // T8 eta-healthcare
  [
    { first: 'Ibrahim', last: 'Al-Sulaiman', email: 'ibrahim@eta-healthcare.com', lang: 'ar' },
    { first: 'Salma', last: 'Al-Rajhi', email: 'salma@eta-healthcare.com', lang: 'ar' },
    { first: 'Adel', last: 'Al-Barrak', email: 'adel@eta-healthcare.com', lang: 'en' },
  ],
  // T9 theta-education
  [
    { first: 'Majed', last: 'Al-Turki', email: 'majed@theta-education.com', lang: 'ar' },
    { first: 'Dalal', last: 'Al-Enezi', email: 'dalal@theta-education.com', lang: 'ar' },
    { first: 'Nabil', last: 'Hamed', email: 'nabil@theta-education.com', lang: 'en' },
  ],
  // T10 iota-logistics
  [
    { first: 'Hamdan', last: 'Al-Malki', email: 'hamdan@iota-logistics.com', lang: 'ar' },
    { first: 'Jawahir', last: 'Al-Thubaiti', email: 'jawahir@iota-logistics.com', lang: 'ar' },
    { first: 'Rami', last: 'Al-Faifi', email: 'rami@iota-logistics.com', lang: 'en' },
  ],
];

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const passwordHash = '$2b$10$iFNvNDNSbbQw1Bb/NkkmRu9QgTrLzul9jUnspozZ3SYfhANM/U8lW';

  // ── 30 Admins ─────────────────────────────────────────────────────────────
  const adminRows = adminNames.map((a, i) => ({
    id: `00000000-0000-4000-a000-0000000000${String(i + 2).padStart(2, '0')}`,
    email: `${a.first.toLowerCase()}.${a.last.toLowerCase().replace('al-', '')}@tatweer.com`,
    passwordHash,
    firstName: a.first,
    lastName: a.last,
    role: a.role,
    isActive: true,
    lastLoginAt: i < 15 ? now : null,
    createdBy: ADMIN_SUPER_ID,
    updatedBy: ADMIN_SUPER_ID,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
  await qi.bulkInsert('admins', adminRows);

  // ── Users (3 per tenant = 30 users) ───────────────────────────────────────
  const userRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < 10; t++) {
    for (let u = 0; u < 3; u++) {
      const un = userNames[t][u];
      userRows.push({
        id: USER_IDS[t][u],
        tenantId: TENANT_IDS[t],
        email: un.email,
        passwordHash,
        firstName: un.first,
        lastName: un.last,
        phone: `+9665${String(t).padStart(2, '0')}${String(u + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 9000) + 1000)}`,
        avatarUrl: null,
        preferredLang: un.lang,
        isActive: true,
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        pinHash: null,
        extraPermissions: JSON.stringify([]),
        revokedPermissions: JSON.stringify([]),
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }
  await qi.bulkInsert('users', userRows);

  // ── Roles (3 system roles per tenant = 30 roles) ──────────────────────────
  const roleTemplates = [
    {
      nameEn: 'Manager',
      nameAr: 'مدير',
      descEn: 'Full access manager role',
      descAr: 'دور مدير بصلاحيات كاملة',
    },
    {
      nameEn: 'Cashier',
      nameAr: 'كاشير',
      descEn: 'POS cashier role',
      descAr: 'دور كاشير نقاط البيع',
    },
    {
      nameEn: 'Employee',
      nameAr: 'موظف',
      descEn: 'Standard employee role',
      descAr: 'دور موظف عادي',
    },
  ];

  let roleId = 1;
  const roleRows: Array<Record<string, unknown>> = [];
  const roleIdMap: number[][] = []; // [tenantIdx][roleIdx] = roleId

  for (let t = 0; t < 10; t++) {
    const tenantRoleIds: number[] = [];
    for (let r = 0; r < 3; r++) {
      const rt = roleTemplates[r];
      tenantRoleIds.push(roleId);
      roleRows.push({
        id: roleId++,
        tenantId: TENANT_IDS[t],
        nameEn: rt.nameEn,
        nameAr: rt.nameAr,
        descriptionEn: rt.descEn,
        descriptionAr: rt.descAr,
        isSystem: true,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
    roleIdMap.push(tenantRoleIds);
  }
  await qi.bulkInsert('roles', roleRows);

  // ── Permissions (same structure for each tenant) ──────────────────────────
  // Must match ALL_PERMISSIONS from src/common/constants/permissions.ts
  const permissionModules = [
    {
      module: 'accounting',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'post',
        'close',
      ],
    },
    {
      module: 'activities',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'audit',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage', 'read'],
    },
    {
      module: 'crm',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'hr',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'approve_leave',
      ],
    },
    {
      module: 'inventory',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'invoices',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'loyalty',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'notifications',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'partners',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'payments',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'payroll',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'pos',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'orders',
        'session',
        'admin',
      ],
    },
    {
      module: 'products',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'projects',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'purchasing',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'approve_order',
      ],
    },
    {
      module: 'reporting',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'restaurant',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'sales',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'approve_order',
      ],
    },
    {
      module: 'settings',
      actions: [
        'view',
        'create',
        'update',
        'delete',
        'approve',
        'export',
        'manage',
        'manage_roles',
        'manage_billing',
        'manage_sequences',
      ],
    },
    {
      module: 'treasury',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage', 'reconcile'],
    },
    {
      module: 'vouchers',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'],
    },
    {
      module: 'zatca',
      actions: ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage', 'read'],
    },
  ];

  let permId = 1;
  const allPermissionRows: Array<Record<string, unknown>> = [];
  const permIdsByTenant: Array<Array<{ id: number; module: string; action: string }>> = [];

  for (let t = 0; t < 10; t++) {
    const tenantPerms: Array<{ id: number; module: string; action: string }> = [];
    for (const pm of permissionModules) {
      for (const action of pm.actions) {
        const pid = permId++;
        tenantPerms.push({ id: pid, module: pm.module, action });
        allPermissionRows.push({
          id: pid,
          tenantId: TENANT_IDS[t],
          module: pm.module,
          action,
          description: `${pm.module}:${action}`,
          conditions: null,
          createdBy: null,
          updatedBy: null,
          version: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }
    }
    permIdsByTenant.push(tenantPerms);
  }
  await qi.bulkInsert('permissions', allPermissionRows);

  // ── Role Permissions ──────────────────────────────────────────────────────
  let rpId = 1;
  const rpRows: Array<Record<string, unknown>> = [];

  for (let t = 0; t < 10; t++) {
    const perms = permIdsByTenant[t];
    const [managerId, cashierId, employeeId] = roleIdMap[t];

    // Manager gets all
    for (const p of perms) {
      rpRows.push({
        id: rpId++,
        tenantId: TENANT_IDS[t],
        roleId: managerId,
        permissionId: p.id,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Cashier gets POS + restaurant + inventory view + products view
    const cashierPerms = perms.filter(
      (p) =>
        p.module === 'pos' ||
        p.module === 'restaurant' ||
        (p.module === 'inventory' && p.action === 'view') ||
        (p.module === 'products' && p.action === 'view'),
    );
    for (const p of cashierPerms) {
      rpRows.push({
        id: rpId++,
        tenantId: TENANT_IDS[t],
        roleId: cashierId,
        permissionId: p.id,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Employee gets all views + activities view
    const viewPerms = perms.filter((p) => p.action === 'view');
    for (const p of viewPerms) {
      rpRows.push({
        id: rpId++,
        tenantId: TENANT_IDS[t],
        roleId: employeeId,
        permissionId: p.id,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await qi.bulkInsert('rolePermissions', rpRows);

  // ── User Roles (1 per user = 30) ──────────────────────────────────────────
  let urId = 1;
  const urRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < 10; t++) {
    for (let u = 0; u < 3; u++) {
      urRows.push({
        id: urId++,
        tenantId: TENANT_IDS[t],
        userId: USER_IDS[t][u],
        roleId: roleIdMap[t][u], // manager=0, cashier=1, employee=2
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await qi.bulkInsert('user_roles', urRows);

  // ── User Tenant Mappings ──────────────────────────────────────────────────
  const utmRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < 10; t++) {
    for (let u = 0; u < 3; u++) {
      utmRows.push({
        id: uuidv7(),
        email: userNames[t][u].email,
        tenantId: TENANT_IDS[t],
        userId: USER_IDS[t][u],
        tenantSlug: TENANT_SLUGS[t],
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await qi.bulkInsert('user_tenant_mappings', utmRows);

  console.log(
    `[03-users-roles] Seeded 30 admins, ${userRows.length} users, ${roleRows.length} roles, ` +
      `${allPermissionRows.length} permissions, ${rpRows.length} role-permissions, ` +
      `${urRows.length} user-roles, ${utmRows.length} user-tenant-mappings.`,
  );
}

export { USER_IDS, TENANT_IDS, TENANT_SLUGS };
