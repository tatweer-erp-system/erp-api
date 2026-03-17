import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('sequences', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    entity: { type: DataTypes.STRING(50), allowNull: false },
    prefix: { type: DataTypes.STRING(20), allowNull: false },
    lastValue: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    padding: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    resetCycle: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'never' },
    fiscalYear: { type: DataTypes.INTEGER, allowNull: true },
    fiscalMonth: { type: DataTypes.INTEGER, allowNull: true },
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

  await qi.addIndex('sequences', ['tenantId', 'branchId', 'entity'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('sequences');
}
