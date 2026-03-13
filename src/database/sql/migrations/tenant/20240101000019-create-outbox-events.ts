import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('outbox_events', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    eventType: { type: DataTypes.STRING(100), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastError: { type: DataTypes.TEXT, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    referenceType: { type: DataTypes.STRING(100), allowNull: true },
    processedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('outbox_events', ['tenantId']);
  await qi.addIndex('outbox_events', ['status', 'createdAt']);
  await qi.addIndex('outbox_events', ['eventType']);
  await qi.addIndex('outbox_events', ['referenceId', 'referenceType']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('outbox_events');
}
