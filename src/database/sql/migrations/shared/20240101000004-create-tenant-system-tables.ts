import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── tenant_metrics (append-only) ───────────────────────────────────────────
  await qi.createTable('tenant_metrics', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    metric_date: { type: DataTypes.DATEONLY, allowNull: false },
    active_users: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    api_calls_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    storage_used_mb: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    records_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('tenant_metrics', ['tenant_slug', 'metric_date'], { unique: true });
  await qi.addIndex('tenant_metrics', ['tenant_slug']);

  // ── tenant_onboarding ──────────────────────────────────────────────────────
  await qi.createTable('tenant_onboarding', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    logo_uploaded: { type: DataTypes.BOOLEAN, defaultValue: false },
    first_user_created: { type: DataTypes.BOOLEAN, defaultValue: false },
    first_employee_added: { type: DataTypes.BOOLEAN, defaultValue: false },
    first_product_added: { type: DataTypes.BOOLEAN, defaultValue: false },
    first_invoice_created: { type: DataTypes.BOOLEAN, defaultValue: false },
    completed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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
  });

  await qi.addIndex('tenant_onboarding', ['tenant_slug'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('tenant_onboarding');
  await qi.dropTable('tenant_metrics');
}
