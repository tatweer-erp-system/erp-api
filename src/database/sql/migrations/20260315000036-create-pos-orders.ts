import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    sessionId: { type: DataTypes.UUID, allowNull: false },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false },
    customerId: { type: DataTypes.UUID, allowNull: true },
    tableId: { type: DataTypes.UUID, allowNull: true },
    orderType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'takeaway' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    tipAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
    deliveryFee: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    pointsEarned: { type: DataTypes.INTEGER, allowNull: true },
    pointsRedeemed: { type: DataTypes.INTEGER, allowNull: true },
    syncedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    pricelistId: { type: DataTypes.UUID, allowNull: true },
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
  await qi.addIndex('pos_orders', ['tenantId', 'orderNumber']);
  await qi.addIndex('pos_orders', ['tenantId', 'status']);
  await qi.addIndex('pos_orders', ['customerId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_orders');
}
