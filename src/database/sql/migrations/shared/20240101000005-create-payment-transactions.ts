import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payment_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'subscriptions', key: 'id' },
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
    },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    provider: { type: DataTypes.STRING(50), allowNull: false },
    provider_transaction_id: { type: DataTypes.STRING(255), allowNull: true },
    provider_response: { type: DataTypes.JSONB, allowNull: true },
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

  await qi.addIndex('payment_transactions', ['subscription_id'], {
    name: 'payment_transactions_subscription_id',
  });
  await qi.addIndex('payment_transactions', ['tenant_id'], {
    name: 'payment_transactions_tenant_id',
  });
  await qi.addIndex('payment_transactions', ['status'], { name: 'payment_transactions_status' });
  await qi.addIndex('payment_transactions', ['created_at'], {
    name: 'payment_transactions_created_at',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('payment_transactions');
  await sequelize.query('DROP TYPE IF EXISTS "enum_payment_transactions_status"');
}
