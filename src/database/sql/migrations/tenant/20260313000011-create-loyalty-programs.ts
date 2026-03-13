import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_programs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    pointsPerCurrency: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    currencyPerPoint: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0.05 },
    expiryDays: { type: DataTypes.INTEGER, allowNull: true },
    minRedeemPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    maxRedeemPct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50.0 },
    settings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
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

  await qi.addIndex('loyalty_programs', ['tenantId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_programs');
}
