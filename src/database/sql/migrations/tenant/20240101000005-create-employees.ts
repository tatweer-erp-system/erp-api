import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('employees', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    department_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'departments', key: 'id' },
      onDelete: 'SET NULL',
    },
    position: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    employment_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'full-time' },
    hire_date: { type: DataTypes.DATEONLY, allowNull: false },
    termination_date: { type: DataTypes.DATEONLY, allowNull: true },
    basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    housing_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    transportation_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    salary_currency: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'SAR' },
    employee_number: { type: DataTypes.STRING(50), allowNull: true },
    manager_id: { type: DataTypes.UUID, allowNull: true },
    nationality: { type: DataTypes.STRING(20), allowNull: true },
    is_saudi: { type: DataTypes.BOOLEAN, defaultValue: true },
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

  await qi.addIndex('employees', ['tenant_id']);
  await qi.addIndex('employees', ['user_id'], { unique: true });
  await qi.addIndex('employees', ['branch_id']);
  await qi.addIndex('employees', ['department_id']);
  await qi.addIndex('employees', ['manager_id']);
  await qi.addIndex('employees', ['employee_number']);
  await qi.addIndex('employees', ['is_saudi']);
  await qi.addIndex('employees', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('employees');
}
