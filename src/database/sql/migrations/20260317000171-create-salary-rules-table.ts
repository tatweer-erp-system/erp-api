import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('salary_rules', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    structureId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'salary_structures', key: 'id' },
      onDelete: 'CASCADE',
    },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    code: { type: DataTypes.STRING(20), allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    category: { type: DataTypes.STRING(20), allowNull: false },
    conditionType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'always' },
    conditionPython: { type: DataTypes.TEXT, allowNull: true },
    computationType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'fixed' },
    amount: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
    percentBase: { type: DataTypes.STRING(20), allowNull: true },
    percentValue: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
    codePython: { type: DataTypes.TEXT, allowNull: true },
    appearsOnPayslip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('salary_rules', ['tenantId']);
  await qi.addIndex('salary_rules', ['structureId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('salary_rules');
}
