import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('settings', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    key: { type: DataTypes.STRING(255), allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: true },
    group: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'general' },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
      allowNull: false,
      defaultValue: 'string',
    },
    description: { type: DataTypes.STRING(255), allowNull: true },
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

  await qi.addIndex('settings', ['tenantId']);
  await qi.addIndex('settings', ['tenantId', 'key'], {
    unique: true,
    name: 'settings_tenant_key_unique',
  });
  await qi.addIndex('settings', ['group']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('settings');
}
