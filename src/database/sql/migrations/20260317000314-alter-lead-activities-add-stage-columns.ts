import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Add fromStageId and toStageId columns (replacing fromStatus/toStatus)
  try {
    await qi.addColumn('lead_activities', 'fromStageId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn('lead_activities', 'toStageId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Add userId column if not exists (some schemas use assignedTo)
  try {
    await qi.addColumn('lead_activities', 'userId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Add activityType column if not exists
  try {
    await qi.addColumn('lead_activities', 'activityType', {
      type: DataTypes.STRING(30),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Add notes column if not exists (replacing summary/title)
  try {
    await qi.addColumn('lead_activities', 'notes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  try {
    await qi.removeColumn('lead_activities', 'fromStageId');
  } catch (e) {
    /* */
  }
  try {
    await qi.removeColumn('lead_activities', 'toStageId');
  } catch (e) {
    /* */
  }
  try {
    await qi.removeColumn('lead_activities', 'userId');
  } catch (e) {
    /* */
  }
  try {
    await qi.removeColumn('lead_activities', 'activityType');
  } catch (e) {
    /* */
  }
  try {
    await qi.removeColumn('lead_activities', 'notes');
  } catch (e) {
    /* */
  }
}
