import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payslip_lines', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    payslipId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payslips', key: 'id' },
      onDelete: 'CASCADE',
    },
    ruleId: { type: DataTypes.UUID, allowNull: true },
    code: { type: DataTypes.STRING(20), allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    category: { type: DataTypes.STRING(20), allowNull: false },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    quantity: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 1 },
    rate: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 1 },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('payslip_lines', ['payslipId']);
  await qi.addIndex('payslip_lines', ['tenantId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payslip_lines');
}
