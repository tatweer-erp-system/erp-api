import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── notifications ──────────────────────────────────────────────────────────
  await qi.createTable('notifications', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: { type: DataTypes.STRING(100), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    data: { type: DataTypes.JSONB, defaultValue: {} },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    read_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('notifications', ['tenant_id']);
  await qi.addIndex('notifications', ['user_id', 'is_read']);
  await qi.addIndex('notifications', ['user_id']);
  await qi.addIndex('notifications', ['type']);
  await qi.addIndex('notifications', ['created_at']);

  // ── notification_preferences ───────────────────────────────────────────────
  await qi.createTable('notification_preferences', {
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
    channel: { type: DataTypes.STRING(50), allowNull: false },
    event_type: { type: DataTypes.STRING(100), allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('notification_preferences', ['tenant_id']);
  await qi.addIndex('notification_preferences', ['user_id', 'channel', 'event_type'], {
    unique: true,
    name: 'notification_prefs_user_channel_event_unique',
  });

  // ── notification_templates ─────────────────────────────────────────────────
  await qi.createTable('notification_templates', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    event_type: { type: DataTypes.STRING(100), allowNull: false },
    channel: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.JSONB, allowNull: true, comment: '{ en: string, ar: string }' },
    body: { type: DataTypes.JSONB, allowNull: false, comment: '{ en: string, ar: string }' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('notification_templates', ['tenant_id']);
  await qi.addIndex('notification_templates', ['event_type', 'channel'], {
    unique: true,
    name: 'notification_templates_event_channel_unique',
  });

  // ── user_fcm_tokens ────────────────────────────────────────────────────────
  await qi.createTable('user_fcm_tokens', {
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
    token: { type: DataTypes.TEXT, allowNull: false },
    device_type: { type: DataTypes.STRING(20), allowNull: true },
    device_name: { type: DataTypes.STRING(100), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    last_used_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('user_fcm_tokens', ['tenant_id']);
  await qi.addIndex('user_fcm_tokens', ['user_id']);
  await qi.addIndex('user_fcm_tokens', ['token'], {
    unique: true,
    name: 'user_fcm_tokens_token_unique',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('user_fcm_tokens');
  await qi.dropTable('notification_templates');
  await qi.dropTable('notification_preferences');
  await qi.dropTable('notifications');
}
