import { Sequelize } from 'sequelize';
import { v7 as uuidv7 } from 'uuid';

const TENANT_IDS = [
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000010',
];

// Stable branch IDs — tenant 1 keeps original format for backward compat with seeders 05-15
function branchId(tenantIdx: number, branchIdx: number): string {
  if (tenantIdx === 0) return `30000000-0000-0000-0000-00000000000${branchIdx + 1}`;
  const t = (tenantIdx + 1).toString(16).toUpperCase();
  return `3000000${t}-0000-0000-0000-00000000000${branchIdx + 1}`;
}

function deptId(tenantIdx: number, deptIdx: number): string {
  if (tenantIdx === 0) return `50000000-0000-0000-0000-00000000000${deptIdx + 1}`;
  const t = (tenantIdx + 1).toString(16).toUpperCase();
  return `5000000${t}-0000-0000-0000-00000000000${deptIdx + 1}`;
}

// ── Stable Job Position IDs for Demo Company ──────────────────────────────────
const JOB_CEO_ID = '55000000-0000-0000-0000-000000000001';
const JOB_CFO_ID = '55000000-0000-0000-0000-000000000002';
const JOB_SALES_MGR_ID = '55000000-0000-0000-0000-000000000003';
const JOB_ACCOUNTANT_ID = '55000000-0000-0000-0000-000000000004';
const JOB_HR_MGR_ID = '55000000-0000-0000-0000-000000000005';
const JOB_WH_SUPERVISOR_ID = '55000000-0000-0000-0000-000000000006';
const JOB_SW_ENGINEER_ID = '55000000-0000-0000-0000-000000000007';
const JOB_MARKETING_MGR_ID = '55000000-0000-0000-0000-000000000008';

const branchDefs = [
  {
    nameEn: 'Main Branch',
    nameAr: 'الفرع الرئيسي',
    code: 'MAIN',
    isMain: true,
    city: 'Riyadh',
    phone: '+966112345678',
  },
  {
    nameEn: 'East Branch',
    nameAr: 'الفرع الشرقي',
    code: 'EAST',
    isMain: false,
    city: 'Dammam',
    phone: '+966132345678',
  },
  {
    nameEn: 'West Branch',
    nameAr: 'الفرع الغربي',
    code: 'WEST',
    isMain: false,
    city: 'Jeddah',
    phone: '+966122345678',
  },
];

const deptDefs = [
  {
    nameEn: 'Sales',
    nameAr: 'المبيعات',
    descEn: 'Sales and customer relations',
    descAr: 'المبيعات وعلاقات العملاء',
  },
  { nameEn: 'HR', nameAr: 'الموارد البشرية', descEn: 'Human resources', descAr: 'الموارد البشرية' },
  {
    nameEn: 'IT',
    nameAr: 'تقنية المعلومات',
    descEn: 'Information technology',
    descAr: 'تقنية المعلومات',
  },
  {
    nameEn: 'Finance',
    nameAr: 'المالية',
    descEn: 'Finance and accounting',
    descAr: 'المالية والمحاسبة',
  },
  {
    nameEn: 'Operations',
    nameAr: 'العمليات',
    descEn: 'Operations management',
    descAr: 'إدارة العمليات',
  },
];

const jobPositionDefs = [
  { id: JOB_CEO_ID, nameEn: 'CEO', nameAr: 'الرئيس التنفيذي', deptIdx: null },
  { id: JOB_CFO_ID, nameEn: 'CFO', nameAr: 'المدير المالي', deptIdx: 3 },
  { id: JOB_SALES_MGR_ID, nameEn: 'Sales Manager', nameAr: 'مدير المبيعات', deptIdx: 0 },
  { id: JOB_ACCOUNTANT_ID, nameEn: 'Accountant', nameAr: 'محاسب', deptIdx: 3 },
  { id: JOB_HR_MGR_ID, nameEn: 'HR Manager', nameAr: 'مدير الموارد البشرية', deptIdx: 1 },
  {
    id: JOB_WH_SUPERVISOR_ID,
    nameEn: 'Warehouse Supervisor',
    nameAr: 'مشرف المستودع',
    deptIdx: 4,
  },
  { id: JOB_SW_ENGINEER_ID, nameEn: 'Software Engineer', nameAr: 'مهندس برمجيات', deptIdx: 2 },
  {
    id: JOB_MARKETING_MGR_ID,
    nameEn: 'Marketing Manager',
    nameAr: 'مدير التسويق',
    deptIdx: null,
  },
];

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();
  const TENANT_ID = TENANT_IDS[0];

  // ── Branches (2-3 per tenant) ─────────────────────────────────────────────
  const branchRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < TENANT_IDS.length; t++) {
    const numBranches = t < 3 ? 3 : 2; // first 3 tenants get 3 branches, rest get 2
    for (let b = 0; b < numBranches; b++) {
      const bd = branchDefs[b];
      branchRows.push({
        id: branchId(t, b),
        tenantId: TENANT_IDS[t],
        nameEn: bd.nameEn,
        nameAr: bd.nameAr,
        descriptionEn: `${bd.nameEn} in ${bd.city}`,
        descriptionAr: `${bd.nameAr} في ${bd.city}`,
        code: bd.code,
        isMain: bd.isMain,
        isActive: true,
        address: `${bd.city}, Saudi Arabia`,
        phone: bd.phone,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }
  await qi.bulkInsert('branches', branchRows);

  // ── Departments (3-5 per tenant) ──────────────────────────────────────────
  const deptRows: Array<Record<string, unknown>> = [];
  for (let t = 0; t < TENANT_IDS.length; t++) {
    const numDepts = t < 3 ? 5 : 3; // first 3 tenants get 5 depts, rest get 3
    for (let d = 0; d < numDepts; d++) {
      const dd = deptDefs[d];
      deptRows.push({
        id: deptId(t, d),
        tenantId: TENANT_IDS[t],
        nameEn: dd.nameEn,
        nameAr: dd.nameAr,
        descriptionEn: dd.descEn,
        descriptionAr: dd.descAr,
        parentId: null,
        managerId: null,
        createdBy: null,
        updatedBy: null,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }
  }
  await qi.bulkInsert('departments', deptRows);

  // ── Job Positions (8 for Demo Company) ────────────────────────────────────
  const jobPositionRows = jobPositionDefs.map((jp) => ({
    id: jp.id,
    tenantId: TENANT_ID,
    nameEn: jp.nameEn,
    nameAr: jp.nameAr,
    departmentId: jp.deptIdx !== null ? deptId(0, jp.deptIdx) : null,
    createdBy: null,
    updatedBy: null,
    version: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
  await qi.bulkInsert('job_positions', jobPositionRows);

  console.log(
    `[04-branches-departments] Seeded ${branchRows.length} branches, ${deptRows.length} departments, and ${jobPositionRows.length} job positions.`,
  );
}

// Re-export IDs for downstream seeders
export {
  JOB_CEO_ID,
  JOB_CFO_ID,
  JOB_SALES_MGR_ID,
  JOB_ACCOUNTANT_ID,
  JOB_HR_MGR_ID,
  JOB_WH_SUPERVISOR_ID,
  JOB_SW_ENGINEER_ID,
  JOB_MARKETING_MGR_ID,
};
