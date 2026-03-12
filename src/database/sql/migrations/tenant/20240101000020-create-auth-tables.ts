import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── refresh_tokens ─────────────────────────────────────────────────────────
  await qi.createTable('refresh_tokens', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    token_hash: { type: DataTypes.STRING(255), allowNull: false },
    family: { type: DataTypes.UUID, allowNull: false },
    device_info: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    expires_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    revoked_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('refresh_tokens', ['tenant_id']);
  await qi.addIndex('refresh_tokens', ['user_id']);
  await qi.addIndex('refresh_tokens', ['token_hash'], {
    unique: true,
    name: 'refresh_tokens_token_hash_unique',
  });
  await qi.addIndex('refresh_tokens', ['expires_at']);
  await qi.addIndex('refresh_tokens', ['family']);

  // ── api_keys ───────────────────────────────────────────────────────────────
  await qi.createTable('api_keys', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    key_hash: { type: DataTypes.STRING(255), allowNull: false },
    key_prefix: { type: DataTypes.STRING(20), allowNull: false },
    scopes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    last_used_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    expires_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    revoked_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('api_keys', ['tenant_id']);
  await qi.addIndex('api_keys', ['key_hash'], { unique: true, name: 'api_keys_key_hash_unique' });
  await qi.addIndex('api_keys', ['key_prefix']);
  await qi.addIndex('api_keys', ['is_active']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('api_keys');
  await qi.dropTable('refresh_tokens');
}
