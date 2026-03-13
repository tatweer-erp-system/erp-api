import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('employees', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'departments', key: 'id' },
      onDelete: 'SET NULL',
    },
    position: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    employmentType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'full-time' },
    hireDate: { type: DataTypes.DATEONLY, allowNull: false },
    terminationDate: { type: DataTypes.DATEONLY, allowNull: true },
    basicSalary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    housingAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    transportationAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    salaryCurrency: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'SAR' },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: true },
    managerId: { type: DataTypes.UUID, allowNull: true },
    nationality: { type: DataTypes.STRING(20), allowNull: true },
    isSaudi: { type: DataTypes.BOOLEAN, defaultValue: true },
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
  await qi.addIndex('employees', ['branchId']);
  await qi.addIndex('employees', ['departmentId']);
  await qi.addIndex('employees', ['managerId']);
  await qi.addIndex('employees', ['employeeNumber']);
  await qi.addIndex('employees', ['isSaudi']);
  await qi.addIndex('employees', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('employees');
}
