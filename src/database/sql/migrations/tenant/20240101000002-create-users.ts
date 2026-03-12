import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    avatar_url: { type: DataTypes.STRING(500), allowNull: true },
    preferred_lang: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'en' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    failed_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    locked_until: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    extra_permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    revoked_permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
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

  await qi.addIndex('users', ['tenant_id']);
  await qi.addIndex('users', ['email'], { unique: true });
  await qi.addIndex('users', ['is_active']);
  await qi.addIndex('users', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('users');
}
