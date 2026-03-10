import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── vendors ────────────────────────────────────────────────────────────────
  await qi.createTable('vendors', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    tax_number: { type: DataTypes.STRING(100), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('vendors', ['is_active']);
  await qi.addIndex('vendors', ['created_at']);

  // ── purchase_orders ────────────────────────────────────────────────────────
  await qi.createTable('purchase_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    order_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'vendors', key: 'id' },
      onDelete: 'SET NULL',
    },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    expected_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('purchase_orders', ['order_number'], { unique: true });
  await qi.addIndex('purchase_orders', ['vendor_id']);
  await qi.addIndex('purchase_orders', ['status']);
  await qi.addIndex('purchase_orders', ['created_at']);

  // ── purchase_order_lines ───────────────────────────────────────────────────
  await qi.createTable('purchase_order_lines', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'purchase_orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    product_id: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    line_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('purchase_order_lines', ['order_id']);
  await qi.addIndex('purchase_order_lines', ['product_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('purchase_order_lines');
  await qi.dropTable('purchase_orders');
  await qi.dropTable('vendors');
}
