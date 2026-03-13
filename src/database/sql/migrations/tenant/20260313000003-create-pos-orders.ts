import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_number: { type: DataTypes.STRING(50), allowNull: false },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    // FK added by Agent C ALTER migration to restaurant_tables
    table_id: { type: DataTypes.UUID, allowNull: true },
    order_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'takeaway' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    discount_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    tax_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    tip_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    total_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    delivery_address: { type: DataTypes.TEXT, allowNull: true },
    delivery_fee: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    points_earned: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    points_redeemed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    synced_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
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
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('pos_orders', ['tenant_id']);
  await qi.addIndex('pos_orders', ['session_id']);
  await qi.addIndex('pos_orders', ['customer_id']);
  await qi.addIndex('pos_orders', ['status']);
  await qi.addIndex('pos_orders', ['created_at']);

  // Unique order_number per tenant (soft-delete aware)
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_orders_order_number_tenant_unique" ON "pos_orders" ("tenant_id", "order_number") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_orders_order_number_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('pos_orders');
}
