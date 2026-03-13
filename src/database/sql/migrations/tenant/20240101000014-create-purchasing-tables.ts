import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── purchase_orders ────────────────────────────────────────────────────────
  await qi.createTable('purchase_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'vendors', key: 'id' },
      onDelete: 'SET NULL',
    },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    expectedDeliveryDate: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('purchase_orders', ['tenantId']);
  await qi.addIndex('purchase_orders', ['branchId']);
  await qi.addIndex('purchase_orders', ['orderNumber'], { unique: true });
  await qi.addIndex('purchase_orders', ['vendorId']);
  await qi.addIndex('purchase_orders', ['status']);
  await qi.addIndex('purchase_orders', ['createdAt']);

  // ── purchase_order_lines ───────────────────────────────────────────────────
  await qi.createTable('purchase_order_lines', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'purchase_orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    lineTotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('purchase_order_lines', ['orderId']);
  await qi.addIndex('purchase_order_lines', ['productId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('purchase_order_lines');
  await qi.dropTable('purchase_orders');
}
