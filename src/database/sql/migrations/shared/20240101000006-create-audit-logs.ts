import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('audit_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantSlug: { type: DataTypes.STRING(100), allowNull: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity: { type: DataTypes.STRING(100), allowNull: false },
    entityId: { type: DataTypes.STRING(255), allowNull: true },
    oldValues: { type: DataTypes.JSONB, allowNull: true },
    newValues: { type: DataTypes.JSONB, allowNull: true },
    ipAddress: { type: DataTypes.STRING(50), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('audit_logs', ['tenantSlug']);
  await qi.addIndex('audit_logs', ['userId']);
  await qi.addIndex('audit_logs', ['action']);
  await qi.addIndex('audit_logs', ['entity', 'entityId']);
  await qi.addIndex('audit_logs', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('audit_logs');
}
