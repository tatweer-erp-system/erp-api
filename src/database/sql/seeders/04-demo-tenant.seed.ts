/**
 * 04 — Demo Tenant Seeder
 *
 * Seeds a complete demo tenant with all supporting data:
 *   Tenant + Subscription + Admin User + Branches + Departments + Employees +
 *   Permissions + Roles + Role_permissions + User_roles + Sequences +
 *   Warehouses + Product categories + Products + Stock_levels
 *
 * This seeder orchestrates the full demo environment in the correct order.
 * Idempotent: checks existence before inserting.
 *
 * Test credentials:
 *   Email:    admin@demo.com
 *   Password: Demo@1234
 *   Tenant:   demo
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/database/sql/seeders/04-demo-tenant.seed.ts
 */

import { Sequelize } from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASS || 'postgres';
const DB_DATABASE = process.env.DB_NAME || 'erp_core';

// ── Permission definitions (inline to avoid import issues in ts-node) ────────

const MODULES = [
  'crm',
  'hr',
  'inventory',
  'sales',
  'purchasing',
  'projects',
  'settings',
  'reports',
  'notifications',
];
const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export'];

const SPECIAL_PERMISSIONS = [
  {
    module: 'settings',
    action: 'manage_roles',
    description: 'Manage system roles and their permissions',
  },
  {
    module: 'settings',
    action: 'manage_billing',
    description: 'Manage billing and subscription settings',
  },
  {
    module: 'settings',
    action: 'manage_sequences',
    description: 'Manage document number sequences',
  },
  {
    module: 'hr',
    action: 'approve_leave',
    description: 'Approve or reject employee leave requests',
  },
  { module: 'sales', action: 'approve_order', description: 'Approve sales orders' },
  { module: 'purchasing', action: 'approve_order', description: 'Approve purchase orders' },
];

function describePermission(module: string, action: string): string {
  const actionLabels: Record<string, string> = {
    view: 'View',
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    approve: 'Approve',
    export: 'Export',
  };
  const moduleLabels: Record<string, string> = {
    crm: 'CRM',
    hr: 'HR',
    inventory: 'Inventory',
    sales: 'Sales',
    purchasing: 'Purchasing',
    projects: 'Projects',
    settings: 'Settings',
    reports: 'Reports',
    notifications: 'Notifications',
  };
  return `${actionLabels[action] || action} ${moduleLabels[module] || module} records`;
}

// ── Role permission filters ──────────────────────────────────────────────────

type PermFilter = (module: string, action: string) => boolean;

const ROLE_FILTERS: Record<string, 'all' | PermFilter> = {
  super_admin: 'all',
  manager: (module, action) => {
    if (module === 'settings' && action === 'manage_roles') return false;
    if (module === 'settings' && action === 'manage_billing') return false;
    return true;
  },
  employee: (module, action) => {
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
    if (module === 'hr' && action === 'create') return true;
    if (module === 'notifications') return true;
    return false;
  },
  accountant: (module, action) => {
    if (['sales', 'purchasing', 'inventory', 'reports'].includes(module)) return true;
    if (module === 'notifications') return true;
    if (module === 'settings' && action === 'view') return true;
    return false;
  },
  hr_manager: (module, action) => {
    if (module === 'hr') return true;
    if (action === 'view' && ['crm', 'projects', 'notifications'].includes(module)) return true;
    if (module === 'notifications') return true;
    if (module === 'reports' && (action === 'view' || action === 'export')) return true;
    return false;
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SEED
// ══════════════════════════════════════════════════════════════════════════════

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
    // 1. TENANT (shared/public schema)
    // ════════════════════════════════════════════════════════════════════════
    console.log('=== 1. Tenant ===');
    const tenantSlug = 'demo';
    let tenantId: string;

    const [existingTenants] = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND "deletedAt" IS NULL`,
      { replacements: { slug: tenantSlug } },
    );

    if ((existingTenants as any[]).length > 0) {
      tenantId = (existingTenants as any[])[0].id;
      console.log(`  Tenant '${tenantSlug}' already exists (id: ${tenantId}).`);
    } else {
      tenantId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.tenants (id, name, slug, status, settings, features, "createdAt", "updatedAt")
         VALUES (:id, :name, :slug, 'active',
                 '{"logo": null}'::jsonb,
                 '{"hr": true, "inventory": true, "crm": true, "purchasing": true, "projects": true, "chat": true, "reporting": true}'::jsonb,
                 NOW(), NOW())`,
        {
          replacements: {
            id: tenantId,
            name: JSON.stringify({ en: 'Demo Company', ar: 'شركة تجريبية' }),
            slug: tenantSlug,
          },
        },
      );
      console.log(`  Created tenant: ${tenantSlug} (id: ${tenantId})`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. SUBSCRIPTION (link to 'business' plan)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 2. Subscription ===');
    const [plans] = await sequelize.query(`SELECT id FROM public.plans WHERE slug = 'business'`);
    if ((plans as any[]).length === 0) {
      console.error('  Business plan not found. Run 01-plans.seed.ts first.');
      process.exit(1);
    }
    const businessPlanId = (plans as any[])[0].id;

    const [existingSubs] = await sequelize.query(
      `SELECT id FROM public.subscriptions WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    if ((existingSubs as any[]).length > 0) {
      console.log(`  Subscription already exists for tenant.`);
    } else {
      const subId = uuidv7();
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await sequelize.query(
        `INSERT INTO public.subscriptions
         (id, "tenantId", "planId", status, "billingCycle", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :planId, 'active', 'annual', :periodStart, :periodEnd, NOW(), NOW())`,
        {
          replacements: {
            id: subId,
            tenantId,
            planId: businessPlanId,
            periodStart,
            periodEnd,
          },
        },
      );
      console.log(`  Created subscription (plan: business, status: active).`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. BRANCHES
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 3. Branches ===');
    const branchData = [
      {
        code: 'HQ',
        name: 'Headquarters',
        nameAr: 'المقر الرئيسي',
        isDefault: true,
        address: 'Riyadh, King Fahd Road',
      },
      {
        code: 'RYD',
        name: 'Riyadh Branch',
        nameAr: 'فرع الرياض',
        isDefault: false,
        address: 'Riyadh, Al-Olaya District',
      },
      {
        code: 'JED',
        name: 'Jeddah Branch',
        nameAr: 'فرع جدة',
        isDefault: false,
        address: 'Jeddah, Al-Tahlia Street',
      },
    ];

    const branchIds: Record<string, string> = {};

    for (const b of branchData) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.branches WHERE "tenantId" = :tenantId AND code = :code AND "deletedAt" IS NULL`,
        { replacements: { tenantId, code: b.code } },
      );

      if ((existing as any[]).length > 0) {
        branchIds[b.code] = (existing as any[])[0].id;
        console.log(`  Branch '${b.code}' already exists.`);
      } else {
        const branchId = uuidv7();
        branchIds[b.code] = branchId;
        await sequelize.query(
          `INSERT INTO public.branches (id, "tenantId", name, code, "isMain", "isActive", address, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :name::jsonb, :code, :isDefault, true, :address, NOW(), NOW())`,
          {
            replacements: {
              id: branchId,
              tenantId,
              name: JSON.stringify({ en: b.name, ar: b.nameAr }),
              code: b.code,
              isDefault: b.isDefault,
              address: b.address,
            },
          },
        );
        console.log(`  Created branch: ${b.code} (${b.name})`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. ADMIN USER
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 4. Admin User ===');
    const adminEmail = 'admin@demo.com';
    const adminPassword = 'Demo@1234';
    let adminId: string;

    const [existingAdmin] = await sequelize.query(
      `SELECT id FROM public.users WHERE email = :email AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { email: adminEmail, tenantId } },
    );

    if ((existingAdmin as any[]).length > 0) {
      adminId = (existingAdmin as any[])[0].id;
      console.log(`  Admin user already exists: ${adminEmail}`);
    } else {
      adminId = uuidv7();
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await sequelize.query(
        `INSERT INTO public.users
         (id, "tenantId", email, "passwordHash", "firstName", "lastName", "isActive", "preferredLang", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :email, :passwordHash, 'Admin', 'User', true, 'en', NOW(), NOW())`,
        {
          replacements: { id: adminId, tenantId, email: adminEmail, passwordHash },
        },
      );
      console.log(`  Created admin user: ${adminEmail}`);
    }

    // User-tenant mapping
    const [existingMapping] = await sequelize.query(
      `SELECT id FROM public.user_tenant_mappings WHERE email = :email AND "tenantId" = :tenantId`,
      { replacements: { email: adminEmail, tenantId } },
    );
    if ((existingMapping as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO public.user_tenant_mappings (id, email, "tenantId", "userId", "tenantSlug", "createdAt", "updatedAt")
         VALUES (:id, :email, :tenantId, :userId, :slug, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv7(),
            email: adminEmail,
            tenantId,
            userId: adminId,
            slug: tenantSlug,
          },
        },
      );
      console.log(`  Created user_tenant_mapping for admin.`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. PERMISSIONS (60 total)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 5. Permissions ===');
    const allPermDefs: Array<{ module: string; action: string; description: string }> = [];

    for (const mod of MODULES) {
      for (const act of ACTIONS) {
        allPermDefs.push({ module: mod, action: act, description: describePermission(mod, act) });
      }
    }
    for (const sp of SPECIAL_PERMISSIONS) {
      allPermDefs.push(sp);
    }

    let permCreated = 0;
    for (const perm of allPermDefs) {
      const [result] = await sequelize.query(
        `INSERT INTO public.permissions ("tenantId", module, action, description, "createdAt", "updatedAt")
         VALUES (:tenantId, :module, :action, :description, NOW(), NOW())
         ON CONFLICT ("tenantId", module, action) DO NOTHING
         RETURNING id`,
        {
          replacements: {
            tenantId,
            module: perm.module,
            action: perm.action,
            description: perm.description,
          },
        },
      );
      if ((result as any[]).length > 0) permCreated++;
    }
    console.log(
      `  Permissions: ${permCreated} created, ${allPermDefs.length - permCreated} already existed.`,
    );

    // Fetch all permission records for role assignment
    const [allPermsRows] = await sequelize.query(
      `SELECT id, module, action FROM public.permissions WHERE "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );
    const permRecords = allPermsRows as Array<{ id: string; module: string; action: string }>;

    // ════════════════════════════════════════════════════════════════════════
    // 6. ROLES + ROLE_PERMISSIONS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 6. Roles & Role Permissions ===');

    const roleDescriptions: Record<string, string> = {
      super_admin: 'Full system access — all modules and actions',
      manager: 'Management access — all except role/billing management',
      employee: 'Basic employee access — view most modules, create HR requests',
      accountant: 'Financial access — full sales, purchasing, inventory, reports',
      hr_manager: 'HR management — full HR module access including leave approval',
    };

    const roleIds: Record<string, string> = {};

    for (const [roleName, filter] of Object.entries(ROLE_FILTERS)) {
      // Upsert role
      const [existingRoles] = await sequelize.query(
        `SELECT id FROM public.roles WHERE "tenantId" = :tenantId AND name = :name AND "deletedAt" IS NULL`,
        { replacements: { tenantId, name: roleName } },
      );

      let roleId: string;
      if ((existingRoles as any[]).length > 0) {
        roleId = (existingRoles as any[])[0].id;
        console.log(`  Role '${roleName}' already exists.`);
      } else {
        const [insertResult] = await sequelize.query(
          `INSERT INTO public.roles ("tenantId", name, description, "isSystem", "createdAt", "updatedAt")
           VALUES (:tenantId, :name, :description, true, NOW(), NOW())
           RETURNING id`,
          {
            replacements: {
              tenantId,
              name: roleName,
              description: roleDescriptions[roleName],
            },
          },
        );
        roleId = (insertResult as any[])[0].id;
        console.log(`  Created role: ${roleName}`);
      }
      roleIds[roleName] = roleId;

      // Assign permissions
      const matchedPerms =
        filter === 'all'
          ? permRecords
          : permRecords.filter((p) => (filter as PermFilter)(p.module, p.action));

      let linked = 0;
      for (const perm of matchedPerms) {
        const [result] = await sequelize.query(
          `INSERT INTO public."rolePermissions" ("tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
           VALUES (:tenantId, :roleId, :permId, NOW(), NOW())
           ON CONFLICT ("roleId", "permissionId") DO NOTHING
           RETURNING id`,
          {
            replacements: { tenantId, roleId, permId: perm.id },
          },
        );
        if ((result as any[]).length > 0) linked++;
      }
      console.log(`    -> ${linked} permissions linked (${matchedPerms.length} total).`);
    }

    // Assign super_admin role to admin user
    const [existingUserRole] = await sequelize.query(
      `SELECT id FROM public.user_roles WHERE "userId" = :userId AND "roleId" = :roleId`,
      { replacements: { userId: adminId, roleId: roleIds.super_admin } },
    );
    if ((existingUserRole as any[]).length === 0) {
      await sequelize.query(
        `INSERT INTO public.user_roles ("tenantId", "userId", "roleId", "createdAt", "updatedAt")
         VALUES (:tenantId, :userId, :roleId, NOW(), NOW())
         ON CONFLICT ("userId", "roleId") DO NOTHING`,
        { replacements: { tenantId, userId: adminId, roleId: roleIds.super_admin } },
      );
      console.log(`  Assigned super_admin role to admin user.`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. DEPARTMENTS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 7. Departments ===');
    const departmentData = [
      {
        name: { en: 'Management', ar: 'الإدارة' },
        desc: { en: 'Executive management', ar: 'الإدارة التنفيذية' },
      },
      {
        name: { en: 'Sales', ar: 'المبيعات' },
        desc: { en: 'Sales and business development', ar: 'المبيعات وتطوير الأعمال' },
      },
      {
        name: { en: 'Human Resources', ar: 'الموارد البشرية' },
        desc: {
          en: 'People operations and HR management',
          ar: 'عمليات الموظفين وإدارة الموارد البشرية',
        },
      },
      {
        name: { en: 'Warehouse', ar: 'المستودعات' },
        desc: { en: 'Warehouse and logistics operations', ar: 'عمليات المستودعات واللوجستيات' },
      },
    ];

    const deptIds: Record<string, string> = {};

    for (const dept of departmentData) {
      const deptKey = dept.name.en;
      const [existing] = await sequelize.query(
        `SELECT id FROM public.departments WHERE "tenantId" = :tenantId AND name->>'en' = :nameEn AND "deletedAt" IS NULL`,
        { replacements: { tenantId, nameEn: dept.name.en } },
      );

      if ((existing as any[]).length > 0) {
        deptIds[deptKey] = (existing as any[])[0].id;
        console.log(`  Department '${deptKey}' already exists.`);
      } else {
        const deptId = uuidv7();
        await sequelize.query(
          `INSERT INTO public.departments (id, "tenantId", name, description, "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :name::jsonb, :desc::jsonb, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: deptId,
              tenantId,
              name: JSON.stringify(dept.name),
              desc: JSON.stringify(dept.desc),
              createdBy: adminId,
            },
          },
        );
        deptIds[deptKey] = deptId;
        console.log(`  Created department: ${deptKey}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. EMPLOYEE USERS (3 employees, each with a user account)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 8. Employee Users ===');
    const defaultHash = await bcrypt.hash('Demo@1234', 10);

    const employeeUsers = [
      {
        email: 'ahmed@demo.com',
        first: 'Ahmed',
        last: 'Al-Rashid',
        role: 'employee',
        department: 'Management',
        branch: 'HQ',
        position: { en: 'General Manager', ar: 'مدير عام' },
        empNo: 'EMP-0001',
        salary: 25000,
        housing: 5000,
        transport: 1500,
        nationality: 'SA',
        isSaudi: true,
        hire: '2024-01-15',
      },
      {
        email: 'sara@demo.com',
        first: 'Sara',
        last: 'Al-Otaibi',
        role: 'employee',
        department: 'Sales',
        branch: 'RYD',
        position: { en: 'Sales Representative', ar: 'مندوبة مبيعات' },
        empNo: 'EMP-0002',
        salary: 12000,
        housing: 3000,
        transport: 1000,
        nationality: 'SA',
        isSaudi: true,
        hire: '2024-03-01',
      },
      {
        email: 'mohammed@demo.com',
        first: 'Mohammed',
        last: 'Al-Harbi',
        role: 'employee',
        department: 'Warehouse',
        branch: 'JED',
        position: { en: 'Warehouse Supervisor', ar: 'مشرف مستودعات' },
        empNo: 'EMP-0003',
        salary: 10000,
        housing: 2500,
        transport: 800,
        nationality: 'SA',
        isSaudi: true,
        hire: '2024-06-01',
      },
    ];

    const userIds: Record<string, string> = {};
    const employeeIds: Record<string, string> = {};

    for (const emp of employeeUsers) {
      // Create user
      const [existingUser] = await sequelize.query(
        `SELECT id FROM public.users WHERE email = :email AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
        { replacements: { email: emp.email, tenantId } },
      );

      let userId: string;
      if ((existingUser as any[]).length > 0) {
        userId = (existingUser as any[])[0].id;
        console.log(`  User '${emp.email}' already exists.`);
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
              email: emp.email,
              hash: defaultHash,
              first: emp.first,
              last: emp.last,
            },
          },
        );
        console.log(`  Created user: ${emp.email}`);
      }
      userIds[emp.email] = userId;

      // User-tenant mapping
      const [existMap] = await sequelize.query(
        `SELECT id FROM public.user_tenant_mappings WHERE email = :email AND "tenantId" = :tenantId`,
        { replacements: { email: emp.email, tenantId } },
      );
      if ((existMap as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO public.user_tenant_mappings (id, email, "tenantId", "userId", "tenantSlug", "createdAt", "updatedAt")
           VALUES (:id, :email, :tenantId, :userId, :slug, NOW(), NOW())
           ON CONFLICT (email, "tenantId") DO NOTHING`,
          { replacements: { id: uuidv7(), email: emp.email, tenantId, userId, slug: tenantSlug } },
        );
      }

      // Assign employee role (user_roles has NO tenantId, NO updated_at)
      const [existUserRole] = await sequelize.query(
        `SELECT id FROM public.user_roles WHERE "userId" = :userId AND "roleId" = :roleId`,
        { replacements: { userId, roleId: roleIds.employee } },
      );
      if ((existUserRole as any[]).length === 0) {
        await sequelize.query(
          `INSERT INTO public.user_roles ("tenantId", "userId", "roleId", "createdAt", "updatedAt")
           VALUES (:tenantId, :userId, :roleId, NOW(), NOW())
           ON CONFLICT ("userId", "roleId") DO NOTHING`,
          { replacements: { tenantId, userId, roleId: roleIds.employee } },
        );
        console.log(`    Assigned employee role to ${emp.email}.`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. EMPLOYEES
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 9. Employees ===');

    for (const emp of employeeUsers) {
      const userId = userIds[emp.email];
      const [existingEmp] = await sequelize.query(
        `SELECT id FROM public.employees WHERE "userId" = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
        { replacements: { userId, tenantId } },
      );

      if ((existingEmp as any[]).length > 0) {
        employeeIds[emp.email] = (existingEmp as any[])[0].id;
        console.log(`  Employee for '${emp.email}' already exists.`);
      } else {
        const empId = uuidv7();
        employeeIds[emp.email] = empId;
        await sequelize.query(
          `INSERT INTO public.employees
           (id, "tenantId", "userId", "departmentId", "branchId", position, "employmentType", "hireDate",
            "basicSalary", "housingAllowance", "transportationAllowance", "salaryCurrency",
            "employeeNumber", nationality, "isSaudi", "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :userId, :deptId, :branchId, :position::jsonb, 'full-time', :hire,
                   :salary, :housing, :transport, 'SAR',
                   :empNo, :nationality, :isSaudi, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: empId,
              tenantId,
              userId,
              deptId: deptIds[emp.department],
              branchId: branchIds[emp.branch],
              position: JSON.stringify(emp.position),
              hire: emp.hire,
              salary: emp.salary,
              housing: emp.housing,
              transport: emp.transport,
              empNo: emp.empNo,
              nationality: emp.nationality,
              isSaudi: emp.isSaudi,
              createdBy: adminId,
            },
          },
        );
        console.log(`  Created employee: ${emp.first} ${emp.last} (${emp.empNo})`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10. SEQUENCES (company-wide)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 10. Sequences ===');

    const companySequences = [
      { entity: 'sales_order', prefix: 'SO', padding: 5, resetCycle: 'yearly' },
      { entity: 'purchase_order', prefix: 'PO', padding: 5, resetCycle: 'yearly' },
      { entity: 'employee', prefix: 'EMP', padding: 4, resetCycle: 'never' },
      { entity: 'lead', prefix: 'LD', padding: 5, resetCycle: 'yearly' },
      { entity: 'project', prefix: 'PRJ', padding: 4, resetCycle: 'never' },
    ];

    for (const seq of companySequences) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.sequences WHERE "tenantId" = :tenantId AND entity = :entity AND "branchId" IS NULL AND "deletedAt" IS NULL`,
        { replacements: { tenantId, entity: seq.entity } },
      );

      if ((existing as any[]).length > 0) {
        console.log(`  Sequence '${seq.entity}' (company-wide) already exists.`);
      } else {
        await sequelize.query(
          `INSERT INTO public.sequences
           (id, "tenantId", "branchId", entity, prefix, padding, "lastValue", "resetCycle", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, NULL, :entity, :prefix, :padding, 0, :resetCycle, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv7(),
              tenantId,
              entity: seq.entity,
              prefix: seq.prefix,
              padding: seq.padding,
              resetCycle: seq.resetCycle,
            },
          },
        );
        console.log(`  Created sequence: ${seq.entity} (${seq.prefix}-xxxxx, company-wide)`);
      }
    }

    // Branch-level sequences (SO + PO for Riyadh and Jeddah)
    console.log('\n  Branch-level sequences:');
    const branchSequences = [
      { entity: 'sales_order', prefix: 'SO' },
      { entity: 'purchase_order', prefix: 'PO' },
    ];
    const branchesForSeq = ['RYD', 'JED'];

    for (const branchCode of branchesForSeq) {
      for (const seq of branchSequences) {
        const branchId = branchIds[branchCode];
        const branchPrefix = `${branchCode}-${seq.prefix}`;

        const [existing] = await sequelize.query(
          `SELECT id FROM public.sequences WHERE "tenantId" = :tenantId AND entity = :entity AND "branchId" = :branchId AND "deletedAt" IS NULL`,
          { replacements: { tenantId, entity: seq.entity, branchId } },
        );

        if ((existing as any[]).length > 0) {
          console.log(`    Sequence '${seq.entity}' for ${branchCode} already exists.`);
        } else {
          await sequelize.query(
            `INSERT INTO public.sequences
             (id, "tenantId", "branchId", entity, prefix, padding, "lastValue", "resetCycle", "createdAt", "updatedAt")
             VALUES (:id, :tenantId, :branchId, :entity, :prefix, 5, 0, 'yearly', NOW(), NOW())`,
            {
              replacements: {
                id: uuidv7(),
                tenantId,
                branchId,
                entity: seq.entity,
                prefix: branchPrefix,
              },
            },
          );
          console.log(
            `    Created sequence: ${seq.entity} (${branchPrefix}-xxxxx, branch: ${branchCode})`,
          );
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 11. WAREHOUSES
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 11. Warehouses ===');
    let mainWarehouseId: string;

    const [existingWh] = await sequelize.query(
      `SELECT id FROM public.warehouses WHERE "tenantId" = :tenantId AND name->>'en' = 'Main Warehouse' AND "deletedAt" IS NULL`,
      { replacements: { tenantId } },
    );

    if ((existingWh as any[]).length > 0) {
      mainWarehouseId = (existingWh as any[])[0].id;
      console.log(`  Main Warehouse already exists.`);
    } else {
      mainWarehouseId = uuidv7();
      await sequelize.query(
        `INSERT INTO public.warehouses (id, "tenantId", name, location, "branchId", "isActive", "createdBy", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :name::jsonb, :location, :branchId, true, :createdBy, NOW(), NOW())`,
        {
          replacements: {
            id: mainWarehouseId,
            tenantId,
            name: JSON.stringify({ en: 'Main Warehouse', ar: 'المستودع الرئيسي' }),
            location: 'Riyadh, Industrial Area',
            branchId: branchIds['HQ'],
            createdBy: adminId,
          },
        },
      );
      console.log(`  Created warehouse: Main Warehouse (linked to HQ)`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 12. PRODUCT CATEGORIES
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 12. Product Categories ===');
    const categoryData = [
      {
        name: { en: 'Electronics', ar: 'إلكترونيات' },
        desc: { en: 'Electronic devices and gadgets', ar: 'الأجهزة الإلكترونية' },
      },
      {
        name: { en: 'Office Furniture', ar: 'أثاث مكتبي' },
        desc: { en: 'Desks, chairs, and office furniture', ar: 'مكاتب وكراسي وأثاث مكتبي' },
      },
    ];

    const catIds: Record<string, string> = {};

    for (const cat of categoryData) {
      const [existing] = await sequelize.query(
        `SELECT id FROM public.product_categories WHERE "tenantId" = :tenantId AND name->>'en' = :nameEn AND "deletedAt" IS NULL`,
        { replacements: { tenantId, nameEn: cat.name.en } },
      );

      if ((existing as any[]).length > 0) {
        catIds[cat.name.en] = (existing as any[])[0].id;
        console.log(`  Category '${cat.name.en}' already exists.`);
      } else {
        const catId = uuidv7();
        catIds[cat.name.en] = catId;
        await sequelize.query(
          `INSERT INTO public.product_categories (id, "tenantId", name, description, "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :name::jsonb, :desc::jsonb, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: catId,
              tenantId,
              name: JSON.stringify(cat.name),
              desc: JSON.stringify(cat.desc),
              createdBy: adminId,
            },
          },
        );
        console.log(`  Created category: ${cat.name.en}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 13. PRODUCTS (5)
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 13. Products ===');
    const productData = [
      {
        sku: 'LAP-001',
        name: { en: 'Laptop', ar: 'لابتوب' },
        desc: {
          en: 'High-performance business laptop, 16GB RAM, 512GB SSD',
          ar: 'لابتوب أعمال عالي الأداء',
        },
        barcode: '6281000000001',
        category: 'Electronics',
        price: 4500,
        cost: 3200,
        uom: 'pcs',
        reorder: 5,
        tax: 15,
        stock: 50,
      },
      {
        sku: 'CHR-001',
        name: { en: 'Office Chair', ar: 'كرسي مكتبي' },
        desc: {
          en: 'Ergonomic office chair with lumbar support',
          ar: 'كرسي مكتبي مريح بدعم للظهر',
        },
        barcode: '6281000000002',
        category: 'Office Furniture',
        price: 850,
        cost: 600,
        uom: 'pcs',
        reorder: 10,
        tax: 15,
        stock: 80,
      },
      {
        sku: 'PRT-001',
        name: { en: 'Printer', ar: 'طابعة' },
        desc: { en: 'Laser printer with wireless connectivity', ar: 'طابعة ليزر مع اتصال لاسلكي' },
        barcode: '6281000000003',
        category: 'Electronics',
        price: 1200,
        cost: 900,
        uom: 'pcs',
        reorder: 8,
        tax: 15,
        stock: 30,
      },
      {
        sku: 'DSK-001',
        name: { en: 'Desk', ar: 'مكتب' },
        desc: { en: 'Adjustable height standing desk', ar: 'مكتب قابل لتعديل الارتفاع' },
        barcode: '6281000000004',
        category: 'Office Furniture',
        price: 1500,
        cost: 1100,
        uom: 'pcs',
        reorder: 5,
        tax: 15,
        stock: 25,
      },
      {
        sku: 'MON-001',
        name: { en: 'Monitor', ar: 'شاشة' },
        desc: {
          en: '27-inch 4K monitor with USB-C connectivity',
          ar: 'شاشة 27 بوصة بدقة 4K مع اتصال USB-C',
        },
        barcode: '6281000000005',
        category: 'Electronics',
        price: 2200,
        cost: 1700,
        uom: 'pcs',
        reorder: 10,
        tax: 15,
        stock: 40,
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
        console.log(`  Product '${prod.sku}' already exists.`);
      } else {
        const prodId = uuidv7();
        productIds[prod.sku] = prodId;
        await sequelize.query(
          `INSERT INTO public.products
           (id, "tenantId", name, description, sku, barcode, "categoryId", "unitPrice", "costPrice",
            currency, "unitOfMeasure", "reorderPoint", "taxRate", "isActive", "createdBy", "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :name::jsonb, :desc::jsonb, :sku, :barcode, :catId, :price, :cost,
                   'SAR', :uom, :reorder, :tax, true, :createdBy, NOW(), NOW())`,
          {
            replacements: {
              id: prodId,
              tenantId,
              name: JSON.stringify(prod.name),
              desc: JSON.stringify(prod.desc),
              sku: prod.sku,
              barcode: prod.barcode,
              catId: catIds[prod.category],
              price: prod.price,
              cost: prod.cost,
              uom: prod.uom,
              reorder: prod.reorder,
              tax: prod.tax,
              createdBy: adminId,
            },
          },
        );
        console.log(`  Created product: ${prod.name.en} (${prod.sku})`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 14. STOCK LEVELS
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 14. Stock Levels ===');

    for (const prod of productData) {
      const prodId = productIds[prod.sku];

      const [existing] = await sequelize.query(
        `SELECT id FROM public.stock_levels WHERE "tenantId" = :tenantId AND "productId" = :prodId AND "warehouseId" = :whId`,
        { replacements: { tenantId, prodId, whId: mainWarehouseId } },
      );

      if ((existing as any[]).length > 0) {
        console.log(`  Stock for ${prod.sku} in Main Warehouse already exists.`);
      } else {
        await sequelize.query(
          `INSERT INTO public.stock_levels ("tenantId", "productId", "warehouseId", quantity, "reservedQuantity", "createdAt", "updatedAt")
           VALUES (:tenantId, :prodId, :whId, :qty, 0, NOW(), NOW())`,
          {
            replacements: {
              tenantId,
              prodId,
              whId: mainWarehouseId,
              qty: prod.stock,
            },
          },
        );
        console.log(`  Created stock: ${prod.sku} -> ${prod.stock} units in Main Warehouse`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 15. BACKOFFICE SUPER ADMIN
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n=== 15. Backoffice Super Admin ===');
    const superAdminEmail = 'superadmin@tatweer.com';
    const [existingSuperAdmin] = await sequelize.query(
      `SELECT id FROM public.admins WHERE email = :email AND "deletedAt" IS NULL`,
      { replacements: { email: superAdminEmail } },
    );

    if ((existingSuperAdmin as any[]).length === 0) {
      const superAdminHash = await bcrypt.hash('Demo@1234', 10);
      await sequelize.query(
        `INSERT INTO public.admins (id, email, "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt")
         VALUES (:id, :email, :passwordHash, 'Super', 'Admin', true, NOW(), NOW())`,
        { replacements: { id: uuidv7(), email: superAdminEmail, passwordHash: superAdminHash } },
      );
      console.log(`  Created super admin: ${superAdminEmail}`);
    } else {
      console.log(`  Super admin already exists: ${superAdminEmail}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n' + '='.repeat(60));
    console.log('Demo Tenant Seed Complete!');
    console.log('='.repeat(60));
    console.log(`Tenant slug:     ${tenantSlug}`);
    console.log(`Tenant ID:       ${tenantId}`);
    console.log(`Admin email:     ${adminEmail}`);
    console.log(`Admin password:  ${adminPassword}`);
    console.log(`Plan:            business`);
    console.log(`Branches:        HQ, RYD, JED`);
    console.log(`Employees:       3 (Ahmed, Sara, Mohammed)`);
    console.log(`Products:        5 (Laptop, Chair, Printer, Desk, Monitor)`);
    console.log(`Permissions:     ${allPermDefs.length}`);
    console.log(
      `Roles:           ${Object.keys(roleIds).length} (${Object.keys(roleIds).join(', ')})`,
    );
    console.log(
      `Sequences:       ${companySequences.length} company-wide + ${branchesForSeq.length * branchSequences.length} branch-level`,
    );
    console.log('');
    console.log('Test with:');
    console.log(`  POST /api/v1/auth/${tenantSlug}/login`);
    console.log(`  Body: { "email": "${adminEmail}", "password": "${adminPassword}" }`);
  } catch (error) {
    console.error('Demo tenant seed failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
