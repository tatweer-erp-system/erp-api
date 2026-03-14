import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Drop UNIQUE constraint — multiple attendance records per day are valid
  // (e.g., morning shift 08:00-16:00 + evening shift 18:00-20:00)
  // Overtime is calculated by summing all records for the day
  await qi.removeIndex('attendance_records', 'attendance_records_tenant_id_employee_id_date');

  // Replace with non-unique index for query performance (IF NOT EXISTS)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "attendance_records_tenant_employee_date"
    ON "attendance_records" ("tenantId", "employeeId", "date")
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.removeIndex('attendance_records', 'attendance_records_tenant_employee_date');
  await qi.addIndex('attendance_records', ['tenantId', 'employeeId', 'date'], {
    name: 'attendance_records_tenant_id_employee_id_date',
    unique: true,
  });
}
