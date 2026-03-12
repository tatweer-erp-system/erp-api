import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('audit_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity: { type: DataTypes.STRING(100), allowNull: false },
    entity_id: { type: DataTypes.STRING(255), allowNull: true },
    old_values: { type: DataTypes.JSONB, allowNull: true },
    new_values: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('audit_logs', ['tenant_slug']);
  await qi.addIndex('audit_logs', ['user_id']);
  await qi.addIndex('audit_logs', ['action']);
  await qi.addIndex('audit_logs', ['entity', 'entity_id']);
  await qi.addIndex('audit_logs', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('audit_logs');
}
