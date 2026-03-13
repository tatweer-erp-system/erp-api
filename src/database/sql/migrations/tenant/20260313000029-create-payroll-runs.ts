import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payroll_runs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    periodStart: { type: DataTypes.DATEONLY, allowNull: false },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    totalEmployees: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalGross: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    totalDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    totalNet: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    totalGosiEmployer: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    processedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    approvedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    journalEntryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
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

  await qi.addIndex('payroll_runs', ['tenantId']);
  await qi.addIndex('payroll_runs', ['status']);
  await qi.addIndex('payroll_runs', ['periodStart']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payroll_runs');
}
