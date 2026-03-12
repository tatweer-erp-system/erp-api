import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('tasks', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'todo' },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    assigned_to: { type: DataTypes.UUID, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    estimated_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
    logged_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
    parent_task_id: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('tasks', ['tenant_id']);
  await qi.addIndex('tasks', ['project_id']);
  await qi.addIndex('tasks', ['status']);
  await qi.addIndex('tasks', ['assigned_to']);
  await qi.addIndex('tasks', ['parent_task_id']);
  await qi.addIndex('tasks', ['due_date']);
  await qi.addIndex('tasks', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('tasks');
}
