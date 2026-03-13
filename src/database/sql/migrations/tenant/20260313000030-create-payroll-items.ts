import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payroll_items', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    run_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payroll_runs', key: 'id' },
      onDelete: 'SET NULL',
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      onDelete: 'SET NULL',
    },
    basic_salary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    housing_allowance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    transportation_allowance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    other_allowances: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    allowances_detail: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    gross_salary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    late_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    absence_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    loan_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    gosi_employee: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    other_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    deductions_detail: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    total_deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    net_pay: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    gosi_employer: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    payment_status: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' },
    payment_date: { type: DataTypes.DATEONLY, allowNull: true },
    payment_reference: { type: DataTypes.STRING(100), allowNull: true },
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
  });

  await qi.addIndex('payroll_items', ['run_id']);
  await qi.addIndex('payroll_items', ['employee_id']);
  await qi.addIndex('payroll_items', ['payment_status']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "payroll_items_run_employee_unique" ON "payroll_items" ("run_id", "employee_id")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "payroll_items_run_employee_unique"');
  await sequelize.getQueryInterface().dropTable('payroll_items');
}
