import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('shifts', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    startTime: { type: DataTypes.TIME, allowNull: false },
    endTime: { type: DataTypes.TIME, allowNull: false },
    breakMinutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 60 },
    isOvernight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    workingDays: { type: DataTypes.JSONB, allowNull: true, defaultValue: [1, 2, 3, 4, 5] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('shifts', ['tenantId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('shifts');
}
