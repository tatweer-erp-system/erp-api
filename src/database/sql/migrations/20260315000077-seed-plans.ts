import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  const [existing] = await sequelize.query(`SELECT id FROM plans WHERE slug = 'starter' LIMIT 1`);
  if ((existing as any[]).length > 0) return;

  const now = new Date();

  await qi.bulkInsert('plans', [
    {
      id: 1,
      slug: 'starter',
      nameEn: 'Starter',
      nameAr: 'مبتدئ',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'SAR',
      modules: JSON.stringify(['pos', 'inventory']),
      maxUsers: 3,
      features: JSON.stringify({ pos: true, inventory: true }),
      isActive: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      slug: 'professional',
      nameEn: 'Professional',
      nameAr: 'احترافي',
      monthlyPrice: 299,
      annualPrice: 2990,
      currency: 'SAR',
      modules: JSON.stringify(['pos', 'inventory', 'crm', 'purchasing', 'hr']),
      maxUsers: 15,
      features: JSON.stringify({
        pos: true,
        inventory: true,
        crm: true,
        purchasing: true,
        hr: true,
      }),
      isActive: true,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      slug: 'enterprise',
      nameEn: 'Enterprise',
      nameAr: 'مؤسسي',
      monthlyPrice: 599,
      annualPrice: 5990,
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
      maxUsers: null,
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
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.bulkDelete('plans', { slug: ['starter', 'professional', 'enterprise'] } as any);
}
