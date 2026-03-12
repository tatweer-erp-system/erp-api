import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('plans', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.JSONB, allowNull: false, comment: '{ en: string, ar: string }' },
    description: { type: DataTypes.JSONB, allowNull: true },
    monthly_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    annual_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
    modules: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of module slugs allowed on this plan',
    },
    max_users: { type: DataTypes.INTEGER, allowNull: true, comment: 'null = unlimited' },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Extra feature flags as key-value pairs',
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  // ── Seed default plans ───────────────────────────────────────────────────
  const now = new Date().toISOString();
  await qi.bulkInsert('plans', [
    {
      slug: 'starter',
      name: JSON.stringify({ en: 'Starter', ar: 'المبتدئ' }),
      description: JSON.stringify({
        en: 'Core HR and user management for small teams',
        ar: 'إدارة الموارد البشرية والمستخدمين للفرق الصغيرة',
      }),
      monthly_price: 99,
      annual_price: 990,
      currency: 'SAR',
      modules: JSON.stringify(['users', 'roles', 'hr', 'notifications']),
      max_users: 10,
      features: JSON.stringify({ in_app_notifications: true }),
      is_active: true,
      sort_order: 1,
      created_at: now,
      updated_at: now,
    },
    {
      slug: 'professional',
      name: JSON.stringify({ en: 'Professional', ar: 'الاحترافي' }),
      description: JSON.stringify({
        en: 'Full CRM, Inventory and Purchasing for growing businesses',
        ar: 'إدارة علاقات العملاء والمخزون والمشتريات للأعمال المتنامية',
      }),
      monthly_price: 299,
      annual_price: 2990,
      currency: 'SAR',
      modules: JSON.stringify([
        'users',
        'roles',
        'hr',
        'notifications',
        'crm',
        'inventory',
        'purchasing',
        'projects',
      ]),
      max_users: 50,
      features: JSON.stringify({ in_app_notifications: true, email_notifications: true }),
      is_active: true,
      sort_order: 2,
      created_at: now,
      updated_at: now,
    },
    {
      slug: 'enterprise',
      name: JSON.stringify({ en: 'Enterprise', ar: 'المؤسسي' }),
      description: JSON.stringify({
        en: 'All modules including Chat, Push notifications and Advanced Reporting',
        ar: 'جميع الوحدات بما فيها الدردشة والإشعارات المتقدمة والتقارير',
      }),
      monthly_price: 699,
      annual_price: 6990,
      currency: 'SAR',
      modules: JSON.stringify([
        'users',
        'roles',
        'hr',
        'notifications',
        'crm',
        'inventory',
        'purchasing',
        'projects',
        'chat',
        'reporting',
      ]),
      max_users: null,
      features: JSON.stringify({
        in_app_notifications: true,
        email_notifications: true,
        sms_notifications: true,
        push_notifications: true,
        pdf_export: true,
        advanced_reporting: true,
      }),
      is_active: true,
      sort_order: 3,
      created_at: now,
      updated_at: now,
    },
  ]);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('plans');
}
