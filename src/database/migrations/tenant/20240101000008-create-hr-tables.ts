import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── departments ────────────────────────────────────────────────────────────
  await qi.createTable('departments', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    parent_id: { type: DataTypes.UUID, allowNull: true },
    manager_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('departments', ['parent_id']);
  await qi.addIndex('departments', ['manager_id']);

  // ── employees ──────────────────────────────────────────────────────────────
  await qi.createTable('employees', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID, allowNull: false, unique: true,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE',
    },
    department_id: {
      type: DataTypes.UUID, allowNull: true,
      references: { model: 'departments', key: 'id' }, onDelete: 'SET NULL',
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
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('employees', ['user_id'], { unique: true });
  await qi.addIndex('employees', ['department_id']);
  await qi.addIndex('employees', ['manager_id']);
  await qi.addIndex('employees', ['employee_number']);
  await qi.addIndex('employees', ['is_saudi']);
  await qi.addIndex('employees', ['created_at']);

  // ── leave_requests ─────────────────────────────────────────────────────────
  await qi.createTable('leave_requests', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    employee_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE',
    },
    leave_type: { type: DataTypes.STRING(50), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    days_requested: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    approved_by: { type: DataTypes.UUID, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('leave_requests', ['employee_id']);
  await qi.addIndex('leave_requests', ['status']);
  await qi.addIndex('leave_requests', ['start_date', 'end_date']);
  await qi.addIndex('leave_requests', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('leave_requests');
  await qi.dropTable('employees');
  await qi.dropTable('departments');
}
