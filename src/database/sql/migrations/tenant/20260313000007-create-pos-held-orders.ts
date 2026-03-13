import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // NO deleted_at — held orders are hard deleted when resumed
  await qi.createTable('pos_held_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    tabLabel: { type: DataTypes.STRING(50), allowNull: false },
    cartSnapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    createdBy: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('pos_held_orders', ['tenantId']);
  await qi.addIndex('pos_held_orders', ['sessionId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_held_orders');
}
