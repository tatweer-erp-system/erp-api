import { MigrationFn } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export const up: MigrationFn<Sequelize> = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  // ── plans ────────────────────────────────────────────────────────────────
  await queryInterface.createTable(
    { tableName: 'plans', schema: 'public' },
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: '{ en: string, ar: string }',
      },
      description: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      monthly_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      annual_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'SAR',
      },
      modules: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of module slugs allowed on this plan',
      },
      max_users: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'null = unlimited',
      },
      features: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Extra feature flags as key-value pairs',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    },
  );

  // ── Seed default plans ───────────────────────────────────────────────────
  const now = new Date().toISOString();
  await queryInterface.bulkInsert({ tableName: 'plans', schema: 'public' }, [
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
      modules: JSON.stringify(['users', 'roles', 'hr', 'notifications', 'crm', 'inventory', 'purchasing', 'projects']),
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
        'users', 'roles', 'hr', 'notifications', 'crm', 'inventory',
        'purchasing', 'projects', 'chat', 'reporting',
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

  // ── subscriptions ─────────────────────────────────────────────────────────
  await queryInterface.createTable(
    { tableName: 'subscriptions', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: { tableName: 'tenants', schema: 'public' }, key: 'id' },
        onDelete: 'CASCADE',
      },
      plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'plans', schema: 'public' }, key: 'id' },
      },
      status: {
        type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
        allowNull: false,
        defaultValue: 'trial',
      },
      billing_cycle: {
        type: DataTypes.ENUM('monthly', 'annual'),
        allowNull: false,
        defaultValue: 'monthly',
      },
      trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      current_period_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      current_period_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    },
  );

  await queryInterface.addIndex(
    { tableName: 'subscriptions', schema: 'public' },
    ['tenant_id'],
    { unique: true, name: 'subscriptions_tenant_id_unique' },
  );

  // ── payment_transactions ──────────────────────────────────────────────────
  await queryInterface.createTable(
    { tableName: 'payment_transactions', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: { tableName: 'subscriptions', schema: 'public' }, key: 'id' },
      },
      tenant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: { tableName: 'tenants', schema: 'public' }, key: 'id' },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'SAR',
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      provider_transaction_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      provider_response: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    },
  );
};

export const down: MigrationFn<Sequelize> = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable({ tableName: 'payment_transactions', schema: 'public' });
  await queryInterface.dropTable({ tableName: 'subscriptions', schema: 'public' });
  await queryInterface.dropTable({ tableName: 'plans', schema: 'public' });
};
