import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payment_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'subscriptions', key: 'id' },
    },
    tenantId: {
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
    providerTransactionId: { type: DataTypes.STRING(255), allowNull: true },
    providerResponse: { type: DataTypes.JSONB, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updatedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('payment_transactions', ['subscriptionId'], {
    name: 'payment_transactions_subscription_id',
  });
  await qi.addIndex('payment_transactions', ['tenantId'], {
    name: 'payment_transactions_tenantId',
  });
  await qi.addIndex('payment_transactions', ['status'], { name: 'payment_transactions_status' });
  await qi.addIndex('payment_transactions', ['createdAt'], {
    name: 'payment_transactions_created_at',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('payment_transactions');
  await sequelize.query('DROP TYPE IF EXISTS "enum_payment_transactions_status"');
}
