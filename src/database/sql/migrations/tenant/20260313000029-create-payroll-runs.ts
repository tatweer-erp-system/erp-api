import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payroll_runs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    period_start: { type: DataTypes.DATEONLY, allowNull: false },
    period_end: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    total_employees: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_gross: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    total_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    total_net: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    total_gosi_employer: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    processed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    processed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    approved_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    journal_entry_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('payroll_runs', ['tenant_id']);
  await qi.addIndex('payroll_runs', ['status']);
  await qi.addIndex('payroll_runs', ['period_start']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payroll_runs');
}
