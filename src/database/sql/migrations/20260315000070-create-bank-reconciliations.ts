import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('bank_reconciliations', {
    id: { type: DataTypes.UUID, primaryKey: true },
    accountId: { type: DataTypes.UUID, allowNull: false },
    statementDate: { type: DataTypes.DATEONLY, allowNull: false },
    openingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    closingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    systemBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    difference: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_progress' },
    reconciledBy: { type: DataTypes.UUID, allowNull: true },
    completedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('bank_reconciliations', ['accountId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('bank_reconciliations');
}
