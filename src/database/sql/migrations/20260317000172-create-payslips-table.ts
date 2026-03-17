import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payslips', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    contractId: { type: DataTypes.UUID, allowNull: true },
    structureId: { type: DataTypes.UUID, allowNull: true },
    reference: { type: DataTypes.STRING(50), allowNull: true },
    periodStart: { type: DataTypes.DATEONLY, allowNull: false },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    grossSalary: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    totalDeductions: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    netSalary: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    gosiEmployee: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    gosiEmployer: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    incomeTax: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    journalEntryId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('payslips', ['tenantId']);
  await qi.addIndex('payslips', ['tenantId', 'branchId']);
  await qi.addIndex('payslips', ['tenantId', 'employeeId']);
  await qi.addIndex('payslips', ['tenantId', 'status']);
  await qi.addIndex('payslips', ['tenantId', 'periodStart', 'periodEnd']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payslips');
}
