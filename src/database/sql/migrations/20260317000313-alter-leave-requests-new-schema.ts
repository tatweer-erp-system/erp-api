import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leave_requests', schema: 'public' };

  // leaveTypeId — alongside existing leaveType enum column for backward compat
  try {
    await qi.addColumn(table, 'leaveTypeId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'isHalfDay', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'halfDayPeriod', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'refusalReason', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Index
  try {
    await qi.addIndex(table, ['tenantId', 'leaveTypeId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leave_requests', schema: 'public' };

  await qi.removeColumn(table, 'refusalReason');
  await qi.removeColumn(table, 'halfDayPeriod');
  await qi.removeColumn(table, 'isHalfDay');
  await qi.removeColumn(table, 'leaveTypeId');
}
