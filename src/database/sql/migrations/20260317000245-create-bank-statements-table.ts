import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('bank_statements', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    journalId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    dateFrom: { type: DataTypes.DATEONLY, allowNull: false },
    dateTo: { type: DataTypes.DATEONLY, allowNull: false },
    balanceStart: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    balanceEnd: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    balanceEndReal: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
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

  await qi.addIndex('bank_statements', ['tenantId']);
  await qi.addIndex('bank_statements', ['tenantId', 'branchId']);
  await qi.addIndex('bank_statements', ['tenantId', 'status']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('bank_statements');
}
