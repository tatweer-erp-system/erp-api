import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('employees', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true, unique: true },
    departmentId: { type: DataTypes.UUID, allowNull: true },
    branchId: { type: DataTypes.UUID, allowNull: true },
    positionEn: { type: DataTypes.STRING(255), allowNull: true },
    positionAr: { type: DataTypes.STRING(255), allowNull: true },
    employmentType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'full-time' },
    hireDate: { type: DataTypes.DATEONLY, allowNull: true },
    terminationDate: { type: DataTypes.DATEONLY, allowNull: true },
    basicSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    housingAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    transportationAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    salaryCurrency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: true },
    managerId: { type: DataTypes.UUID, allowNull: true },
    nationality: { type: DataTypes.STRING(20), allowNull: true },
    isSaudi: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('employees', ['tenantId']);
  await qi.addIndex('employees', ['userId'], { unique: true });
  await qi.addIndex('employees', ['departmentId']);
  await qi.addIndex('employees', ['branchId']);
  await qi.addIndex('employees', ['tenantId', 'employeeNumber']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('employees');
}
