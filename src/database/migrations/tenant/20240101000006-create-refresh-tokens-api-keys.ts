import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── refresh_tokens ─────────────────────────────────────────────────────────
  await qi.createTable('refresh_tokens', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE',
    },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    token_hash: { type: DataTypes.STRING(255), allowNull: false },
    family: { type: DataTypes.UUID, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('refresh_tokens', ['user_id']);
  await qi.addIndex('refresh_tokens', ['token_hash']);
  await qi.addIndex('refresh_tokens', ['family']);
  await qi.addIndex('refresh_tokens', ['expires_at']);

  // ── api_keys ───────────────────────────────────────────────────────────────
  await qi.createTable('api_keys', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    key_hash: { type: DataTypes.STRING(255), allowNull: false },
    scopes: { type: DataTypes.JSONB, defaultValue: [] },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('api_keys', ['key_hash'], { unique: true });
  await qi.addIndex('api_keys', ['tenant_slug']);
  await qi.addIndex('api_keys', ['is_active']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('api_keys');
  await qi.dropTable('refresh_tokens');
}
