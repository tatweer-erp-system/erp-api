import { Sequelize } from 'sequelize';

/**
 * Test-only plans — additional plans on top of the 3 system plans
 * (starter, professional, enterprise) already seeded by migration.
 */
export async function seed(sequelize: Sequelize): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const now = new Date();

  await qi.bulkInsert('plans', [
    {
      id: 4,
      slug: 'trial',
      nameEn: 'Free Trial',
      nameAr: 'تجربة مجانية',
      descriptionEn: '14-day free trial with full features',
      descriptionAr: 'تجربة مجانية لمدة 14 يوم بكامل المزايا',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'SAR',
      modules: JSON.stringify([
        'pos',
        'inventory',
        'crm',
        'purchasing',
        'hr',
        'projects',
        'reporting',
        'chat',
      ]),
      maxUsers: 5,
      features: JSON.stringify({
        pos: true,
        inventory: true,
        crm: true,
        purchasing: true,
        hr: true,
        projects: true,
        reporting: true,
        chat: true,
      }),
      isActive: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      slug: 'pos-only',
      nameEn: 'POS Only',
      nameAr: 'نقاط البيع فقط',
      descriptionEn: 'Point of sale only plan for retail shops',
      descriptionAr: 'خطة نقاط البيع فقط لمحلات التجزئة',
      monthlyPrice: 99,
      annualPrice: 990,
      currency: 'SAR',
      modules: JSON.stringify(['pos']),
      maxUsers: 5,
      features: JSON.stringify({ pos: true }),
      isActive: true,
      sortOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      slug: 'inactive-plan',
      nameEn: 'Deprecated Plan',
      nameAr: 'خطة متوقفة',
      descriptionEn: 'An inactive plan for testing inactive state',
      descriptionAr: 'خطة غير نشطة لاختبار الحالة غير النشطة',
      monthlyPrice: 199,
      annualPrice: 1990,
      currency: 'SAR',
      modules: JSON.stringify(['pos', 'inventory']),
      maxUsers: 10,
      features: JSON.stringify({ pos: true, inventory: true }),
      isActive: false,
      sortOrder: 99,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('[01-plans] Seeded 3 additional test plans (trial, pos-only, inactive).');
}
