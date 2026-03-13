import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payroll_items', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    runId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payroll_runs', key: 'id' },
      onDelete: 'SET NULL',
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      onDelete: 'SET NULL',
    },
    basicSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    housingAllowance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    transportationAllowance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0.0,
    },
    otherAllowances: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    allowancesDetail: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    grossSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    lateDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    absenceDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    loanDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    gosiEmployee: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    otherDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    deductionsDetail: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    totalDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    netPay: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    gosiEmployer: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'pending' },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true },
    paymentReference: { type: DataTypes.STRING(100), allowNull: true },
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

  await qi.addIndex('payroll_items', ['runId']);
  await qi.addIndex('payroll_items', ['employeeId']);
  await qi.addIndex('payroll_items', ['paymentStatus']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "payroll_items_run_employee_unique" ON "payroll_items" ("runId", "employeeId")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "payroll_items_run_employee_unique"');
  await sequelize.getQueryInterface().dropTable('payroll_items');
}
