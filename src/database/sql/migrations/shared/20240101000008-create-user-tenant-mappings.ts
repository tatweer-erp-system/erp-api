import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('user_tenant_mappings', {
    id: { type: DataTypes.UUID, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
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

  await qi.addIndex('user_tenant_mappings', ['email', 'tenant_id'], { unique: true });
  await qi.addIndex('user_tenant_mappings', ['email']);
  await qi.addIndex('user_tenant_mappings', ['user_id']);
  await qi.addIndex('user_tenant_mappings', ['tenant_slug']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('user_tenant_mappings');
}
