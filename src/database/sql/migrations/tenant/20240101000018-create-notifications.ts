import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── notifications ──────────────────────────────────────────────────────────
  await qi.createTable('notifications', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: { type: DataTypes.STRING(100), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    data: { type: DataTypes.JSONB, defaultValue: {} },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    readAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('notifications', ['tenantId']);
  await qi.addIndex('notifications', ['userId', 'isRead']);
  await qi.addIndex('notifications', ['userId']);
  await qi.addIndex('notifications', ['type']);
  await qi.addIndex('notifications', ['createdAt']);

  // ── notification_preferences ───────────────────────────────────────────────
  await qi.createTable('notification_preferences', {
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
    channel: { type: DataTypes.STRING(50), allowNull: false },
    eventType: { type: DataTypes.STRING(100), allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('notification_preferences', ['tenantId']);
  await qi.addIndex('notification_preferences', ['userId', 'channel', 'eventType'], {
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
    tenantId: { type: DataTypes.UUID, allowNull: false },
    eventType: { type: DataTypes.STRING(100), allowNull: false },
    channel: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.JSONB, allowNull: true, comment: '{ en: string, ar: string }' },
    body: { type: DataTypes.JSONB, allowNull: false, comment: '{ en: string, ar: string }' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('notification_templates', ['tenantId']);
  await qi.addIndex('notification_templates', ['eventType', 'channel'], {
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
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    token: { type: DataTypes.TEXT, allowNull: false },
    deviceType: { type: DataTypes.STRING(20), allowNull: true },
    deviceName: { type: DataTypes.STRING(100), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastUsedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('user_fcm_tokens', ['tenantId']);
  await qi.addIndex('user_fcm_tokens', ['userId']);
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
