import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'activities', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      model: { type: DataTypes.STRING(50), allowNull: false },
      recordId: { type: DataTypes.UUID, allowNull: false },
      recordName: { type: DataTypes.STRING(255), allowNull: true },
      activityType: { type: DataTypes.STRING(30), allowNull: false },
      icon: { type: DataTypes.STRING(50), allowNull: true },
      summary: { type: DataTypes.STRING(500), allowNull: false },
      note: { type: DataTypes.TEXT, allowNull: true },
      scheduledDate: { type: DataTypes.DATEONLY, allowNull: false },
      assignedTo: { type: DataTypes.UUID, allowNull: false },
      isDone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      doneAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
      doneByUserId: { type: DataTypes.UUID, allowNull: true },
      feedbackNote: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
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
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
  );

  const table = { tableName: 'activities', schema: 'public' };

  await qi.addIndex(table, ['tenantId']);
  await qi.addIndex(table, ['tenantId', 'model', 'recordId']);
  await qi.addIndex(table, ['tenantId', 'assignedTo']);
  await qi.addIndex(table, ['tenantId', 'isDone']);
  await qi.addIndex(table, ['tenantId', 'scheduledDate']);
  await qi.addIndex(table, ['tenantId', 'assignedTo', 'isDone']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable({ tableName: 'activities', schema: 'public' });
}
