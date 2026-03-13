import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('table_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    table_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'restaurant_tables', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    guest_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    seated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    released_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    total_revenue: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
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
  });

  await qi.addIndex('table_sessions', ['table_id']);
  await qi.addIndex('table_sessions', ['order_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('table_sessions');
}
