import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('subscriptions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
      onDelete: 'CASCADE',
    },
    planId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'plans', key: 'id' },
    },
    status: {
      type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'trial',
    },
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'annual'),
      allowNull: false,
      defaultValue: 'monthly',
    },
    trialEndsAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    currentPeriodStart: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    currentPeriodEnd: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    cancelledAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('subscriptions', ['tenantId'], {
    unique: true,
    name: 'subscriptionsTenantIdUnique',
  });
  await qi.addIndex('subscriptions', ['status'], { name: 'subscriptionsStatus' });
  await qi.addIndex('subscriptions', ['planId'], { name: 'subscriptionsPlanId' });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('subscriptions');
  await sequelize.query('DROP TYPE IF EXISTS "enumSubscriptionsStatus"');
  await sequelize.query('DROP TYPE IF EXISTS "enumSubscriptionsBillingCycle"');
}
