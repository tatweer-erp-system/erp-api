import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payroll_items', {
    id: { type: DataTypes.UUID, primaryKey: true },
    runId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    basicSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    housingAllowance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    transportationAllowance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    otherAllowances: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    allowancesDetail: { type: DataTypes.JSONB, allowNull: true },
    grossSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    lateDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    absenceDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    loanDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    gosiEmployee: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    otherDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    deductionsDetail: { type: DataTypes.JSONB, allowNull: true },
    totalDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    netPay: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    gosiEmployer: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true },
    paymentReference: { type: DataTypes.STRING(100), allowNull: true },
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

  await qi.addIndex('payroll_items', ['runId']);
  await qi.addIndex('payroll_items', ['employeeId']);
  await qi.addIndex('payroll_items', ['runId', 'employeeId'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payroll_items');
}
