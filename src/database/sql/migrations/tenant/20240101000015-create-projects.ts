import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── projects (NO members JSONB column) ─────────────────────────────────────
  await qi.createTable('projects', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planning' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    budget: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    managerId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('projects', ['tenantId']);
  await qi.addIndex('projects', ['status']);
  await qi.addIndex('projects', ['managerId']);
  await qi.addIndex('projects', ['createdAt']);

  // ── project_members ────────────────────────────────────────────────────────
  await qi.createTable('project_members', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'projects', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    role: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'member' },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('project_members', ['projectId', 'userId'], {
    unique: true,
    name: 'project_members_project_user_unique',
  });
  await qi.addIndex('project_members', ['tenantId']);
  await qi.addIndex('project_members', ['projectId']);
  await qi.addIndex('project_members', ['userId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('project_members');
  await qi.dropTable('projects');
}
