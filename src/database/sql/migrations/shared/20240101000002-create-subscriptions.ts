import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('subscriptions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
      onDelete: 'CASCADE',
    },
    plan_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'plans', key: 'id' },
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
    trial_ends_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    current_period_start: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    current_period_end: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    cancelled_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('subscriptions', ['tenant_id'], {
    unique: true,
    name: 'subscriptions_tenant_id_unique',
  });
  await qi.addIndex('subscriptions', ['status'], { name: 'subscriptions_status' });
  await qi.addIndex('subscriptions', ['plan_id'], { name: 'subscriptions_plan_id' });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('subscriptions');
  await sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_status"');
  await sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_billing_cycle"');
}
