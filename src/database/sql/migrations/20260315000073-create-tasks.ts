import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('tasks', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    projectId: { type: DataTypes.UUID, allowNull: false },
    titleEn: { type: DataTypes.STRING(255), allowNull: false },
    titleAr: { type: DataTypes.STRING(255), allowNull: false },
    descriptionEn: { type: DataTypes.TEXT, allowNull: true },
    descriptionAr: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'todo' },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    estimatedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    loggedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    parentTaskId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('tasks', ['tenantId']);
  await qi.addIndex('tasks', ['projectId']);
  await qi.addIndex('tasks', ['assignedTo']);
  await qi.addIndex('tasks', ['tenantId', 'status']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('tasks');
}
