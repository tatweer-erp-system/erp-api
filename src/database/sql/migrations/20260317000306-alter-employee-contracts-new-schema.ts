import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'employee_contracts', schema: 'public' };

  try {
    await qi.addColumn(table, 'salaryStructureId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'wageType', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'monthly',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'wage', {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      defaultValue: 0.0,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'workingScheduleId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'employee_contracts', schema: 'public' };

  await qi.removeColumn(table, 'workingScheduleId');
  await qi.removeColumn(table, 'wage');
  await qi.removeColumn(table, 'wageType');
  await qi.removeColumn(table, 'salaryStructureId');
}
