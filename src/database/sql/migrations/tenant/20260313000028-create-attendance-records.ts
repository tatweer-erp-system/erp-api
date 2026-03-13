import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('attendance_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      onDelete: 'SET NULL',
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    clock_in: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    clock_out: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'present' },
    late_minutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    overtime_minutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    working_hours: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    source: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'manual' },
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
  });

  await qi.addIndex('attendance_records', ['tenant_id']);
  await qi.addIndex('attendance_records', ['employee_id']);
  await qi.addIndex('attendance_records', ['date']);
  await qi.addIndex('attendance_records', ['status']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "attendance_employee_date_unique" ON "attendance_records" ("employee_id", "date")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "attendance_employee_date_unique"');
  await sequelize.getQueryInterface().dropTable('attendance_records');
}
