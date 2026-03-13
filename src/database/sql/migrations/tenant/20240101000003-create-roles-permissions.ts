import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── roles ──────────────────────────────────────────────────────────────────
  await qi.createTable('roles', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false },
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

  await qi.addIndex('roles', ['tenantId', 'name'], {
    unique: true,
    name: 'roles_tenantId_name_unique',
  });
  await qi.addIndex('roles', ['tenantId']);

  // ── permissions ────────────────────────────────────────────────────────────
  await qi.createTable('permissions', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    module: { type: DataTypes.STRING(100), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    conditions: { type: DataTypes.JSONB, allowNull: true },
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

  await qi.addIndex('permissions', ['tenantId']);
  await qi.addIndex('permissions', ['tenantId', 'module', 'action'], { unique: true });

  // ── rolePermissions ───────────────────────────────────────────────────────
  await qi.createTable('rolePermissions', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    roleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
    },
    permissionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'permissions', key: 'id' },
      onDelete: 'CASCADE',
    },
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
  });

  await qi.addIndex('rolePermissions', ['tenantId']);
  await qi.addIndex('rolePermissions', ['roleId', 'permissionId'], { unique: true });
  await qi.addIndex('rolePermissions', ['roleId']);
  await qi.addIndex('rolePermissions', ['permissionId']);

  // ── user_roles ─────────────────────────────────────────────────────────────
  await qi.createTable('user_roles', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
    },
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
  });

  await qi.addIndex('user_roles', ['tenantId']);
  await qi.addIndex('user_roles', ['userId', 'roleId'], { unique: true });
  await qi.addIndex('user_roles', ['userId']);
  await qi.addIndex('user_roles', ['roleId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('user_roles');
  await qi.dropTable('rolePermissions');
  await qi.dropTable('permissions');
  await qi.dropTable('roles');
}
