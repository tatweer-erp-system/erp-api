import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('impersonation_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    adminId: { type: DataTypes.UUID, allowNull: false },
    targetUserId: { type: DataTypes.UUID, allowNull: false },
    tenantSlug: { type: DataTypes.STRING(100), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    ipAddress: { type: DataTypes.STRING(50), allowNull: true },
    startedAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    tokenExpiresAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
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

  await qi.addIndex('impersonation_logs', ['adminId']);
  await qi.addIndex('impersonation_logs', ['tenantSlug']);
  await qi.addIndex('impersonation_logs', ['startedAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('impersonation_logs');
}
