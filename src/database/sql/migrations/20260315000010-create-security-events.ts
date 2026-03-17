import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('security_events', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    eventType: { type: DataTypes.STRING(50), allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true },
    tenantSlug: { type: DataTypes.STRING(100), allowNull: true },
    ipAddress: { type: DataTypes.STRING(50), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('security_events', ['tenantId']);
  await qi.addIndex('security_events', ['userId']);
  await qi.addIndex('security_events', ['eventType']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('security_events');
}
