import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('impersonation_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    admin_id: { type: DataTypes.UUID, allowNull: false },
    target_user_id: { type: DataTypes.UUID, allowNull: false },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    started_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    token_expires_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
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

  await qi.addIndex('impersonation_logs', ['admin_id']);
  await qi.addIndex('impersonation_logs', ['tenant_slug']);
  await qi.addIndex('impersonation_logs', ['started_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('impersonation_logs');
}
