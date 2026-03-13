import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // IMMUTABLE TABLE — no deleted_at, no version, no updated_by, no updated_at
  await qi.createTable('pos_order_items', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'products', key: 'id' },
      onDelete: 'SET NULL',
    },
    product_name: { type: DataTypes.STRING(200), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15.0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    line_total: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    course: { type: DataTypes.STRING(30), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    fired_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('pos_order_items', ['order_id']);
  await qi.addIndex('pos_order_items', ['product_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_order_items');
}
