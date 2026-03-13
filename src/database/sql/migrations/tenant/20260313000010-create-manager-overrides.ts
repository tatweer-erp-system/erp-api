import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // IMMUTABLE audit trail — no deleted_at
  await qi.createTable('manager_overrides', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    actionType: { type: DataTypes.STRING(50), allowNull: false },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
  });

  await qi.addIndex('manager_overrides', ['tenantId']);
  await qi.addIndex('manager_overrides', ['sessionId']);
  await qi.addIndex('manager_overrides', ['orderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('manager_overrides');
}
