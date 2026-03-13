import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    // FK added by Agent C ALTER migration to restaurant_tables
    tableId: { type: DataTypes.UUID, allowNull: true },
    orderType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'takeaway' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    tipAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
    deliveryFee: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    pointsEarned: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    pointsRedeemed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    syncedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('pos_orders', ['tenantId']);
  await qi.addIndex('pos_orders', ['sessionId']);
  await qi.addIndex('pos_orders', ['customerId']);
  await qi.addIndex('pos_orders', ['status']);
  await qi.addIndex('pos_orders', ['createdAt']);

  // Unique order_number per tenant (soft-delete aware)
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_orders_order_number_tenant_unique" ON "pos_orders" ("tenantId", "orderNumber") WHERE "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_orders_order_number_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('pos_orders');
}
