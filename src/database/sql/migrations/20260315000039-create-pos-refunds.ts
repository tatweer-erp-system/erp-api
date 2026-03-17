import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_refunds', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    originalOrderId: { type: DataTypes.UUID, allowNull: false },
    refundOrderId: { type: DataTypes.UUID, allowNull: true },
    refundType: { type: DataTypes.STRING(20), allowNull: false },
    totalRefunded: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    refundMethod: { type: DataTypes.STRING(30), allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    approvedBy: { type: DataTypes.UUID, allowNull: false },
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

  await qi.addIndex('pos_refunds', ['tenantId']);
  await qi.addIndex('pos_refunds', ['originalOrderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_refunds');
}
