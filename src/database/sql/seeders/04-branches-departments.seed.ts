import { Sequelize } from 'sequelize';

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

export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  // Each tenant gets 2-3 branches
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

  // Each tenant gets 3-5 departments
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

  console.log(
    `[04-branches-departments] Seeded ${branchRows.length} branches and ${deptRows.length} departments across ${TENANT_IDS.length} tenants.`,
  );
}
