import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── refresh_tokens ─────────────────────────────────────────────────────────
  await qi.createTable('refresh_tokens', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    tokenHash: { type: DataTypes.STRING(255), allowNull: false },
    family: { type: DataTypes.UUID, allowNull: false },
    deviceInfo: { type: DataTypes.JSONB, allowNull: true },
    ipAddress: { type: DataTypes.STRING(50), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    expiresAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    revokedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('refresh_tokens', ['tenantId']);
  await qi.addIndex('refresh_tokens', ['userId']);
  await qi.addIndex('refresh_tokens', ['tokenHash'], {
    unique: true,
    name: 'refresh_tokens_token_hash_unique',
  });
  await qi.addIndex('refresh_tokens', ['expiresAt']);
  await qi.addIndex('refresh_tokens', ['family']);

  // ── api_keys ───────────────────────────────────────────────────────────────
  await qi.createTable('api_keys', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    keyHash: { type: DataTypes.STRING(255), allowNull: false },
    keyPrefix: { type: DataTypes.STRING(20), allowNull: false },
    scopes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastUsedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    expiresAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    revokedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('api_keys', ['tenantId']);
  await qi.addIndex('api_keys', ['keyHash'], { unique: true, name: 'api_keys_key_hash_unique' });
  await qi.addIndex('api_keys', ['keyPrefix']);
  await qi.addIndex('api_keys', ['isActive']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('api_keys');
  await qi.dropTable('refresh_tokens');
}
