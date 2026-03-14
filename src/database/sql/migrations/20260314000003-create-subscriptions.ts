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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'plans', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'trial' },
    billingCycle: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'monthly' },
    trialEndsAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    currentPeriodStart: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    currentPeriodEnd: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    cancelledAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    autoRenewal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
  });

  await qi.addIndex('subscriptions', ['tenantId']);
  await qi.addIndex('subscriptions', ['status']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('subscriptions');
}
