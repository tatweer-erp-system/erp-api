import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── notification_preferences ───────────────────────────────────────────────
  await qi.createTable('notification_preferences', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'users', key: 'id' }, onDelete: 'CASCADE',
    },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    channel: { type: DataTypes.STRING(20), allowNull: false },
    event_type: { type: DataTypes.STRING(100), allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('notification_preferences', ['user_id', 'channel', 'event_type'], { unique: true });
  await qi.addIndex('notification_preferences', ['user_id']);

  // ── notification_templates ─────────────────────────────────────────────────
  await qi.createTable('notification_templates', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    event_type: { type: DataTypes.STRING(100), allowNull: false },
    channel: { type: DataTypes.STRING(20), allowNull: false },
    subject_en: { type: DataTypes.STRING(255), allowNull: true },
    subject_ar: { type: DataTypes.STRING(255), allowNull: true },
    body_en: { type: DataTypes.TEXT, allowNull: false },
    body_ar: { type: DataTypes.TEXT, allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('notification_templates', ['tenant_slug', 'event_type', 'channel'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('notification_templates');
  await qi.dropTable('notification_preferences');
}
