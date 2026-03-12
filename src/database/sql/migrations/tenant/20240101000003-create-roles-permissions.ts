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
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
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

  await qi.addIndex('roles', ['tenant_id', 'name'], {
    unique: true,
    name: 'roles_tenant_id_name_unique',
  });
  await qi.addIndex('roles', ['tenant_id']);

  // ── permissions ────────────────────────────────────────────────────────────
  await qi.createTable('permissions', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    module: { type: DataTypes.STRING(100), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    conditions: { type: DataTypes.JSONB, allowNull: true },
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

  await qi.addIndex('permissions', ['tenant_id']);
  await qi.addIndex('permissions', ['tenant_id', 'module', 'action'], { unique: true });

  // ── role_permissions ───────────────────────────────────────────────────────
  await qi.createTable('role_permissions', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'permissions', key: 'id' },
      onDelete: 'CASCADE',
    },
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

  await qi.addIndex('role_permissions', ['tenant_id']);
  await qi.addIndex('role_permissions', ['role_id', 'permission_id'], { unique: true });
  await qi.addIndex('role_permissions', ['role_id']);
  await qi.addIndex('role_permissions', ['permission_id']);

  // ── user_roles ─────────────────────────────────────────────────────────────
  await qi.createTable('user_roles', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'roles', key: 'id' },
      onDelete: 'CASCADE',
    },
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

  await qi.addIndex('user_roles', ['tenant_id']);
  await qi.addIndex('user_roles', ['user_id', 'role_id'], { unique: true });
  await qi.addIndex('user_roles', ['user_id']);
  await qi.addIndex('user_roles', ['role_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('user_roles');
  await qi.dropTable('role_permissions');
  await qi.dropTable('permissions');
  await qi.dropTable('roles');
}
