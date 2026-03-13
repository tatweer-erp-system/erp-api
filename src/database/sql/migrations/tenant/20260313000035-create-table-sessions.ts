import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('table_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tableId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'restaurant_tables', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    guestCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    seatedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    releasedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    totalRevenue: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
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

  await qi.addIndex('table_sessions', ['tableId']);
  await qi.addIndex('table_sessions', ['orderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('table_sessions');
}
