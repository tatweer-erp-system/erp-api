import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── product_categories ─────────────────────────────────────────────────────
  await qi.createTable('product_categories', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    parent_id: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('product_categories', ['parent_id']);

  // ── products ───────────────────────────────────────────────────────────────
  await qi.createTable('products', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    sku: { type: DataTypes.STRING(100), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    category_id: {
      type: DataTypes.UUID, allowNull: true,
      references: { model: 'product_categories', key: 'id' }, onDelete: 'SET NULL',
    },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    cost_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    unit_of_measure: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
    reorder_point: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    images: { type: DataTypes.JSONB, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('products', ['category_id']);
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique" ON "products" ("sku") WHERE "sku" IS NOT NULL AND "deleted_at" IS NULL');
  await qi.addIndex('products', ['barcode']);
  await qi.addIndex('products', ['is_active']);
  await qi.addIndex('products', ['created_at']);

  // ── warehouses ─────────────────────────────────────────────────────────────
  await qi.createTable('warehouses', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    location: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('warehouses', ['is_active']);

  // ── stock_levels ───────────────────────────────────────────────────────────
  await qi.createTable('stock_levels', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    product_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'products', key: 'id' }, onDelete: 'CASCADE',
    },
    warehouse_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'warehouses', key: 'id' }, onDelete: 'CASCADE',
    },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
    reserved_quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('stock_levels', ['product_id', 'warehouse_id'], { unique: true });
  await qi.addIndex('stock_levels', ['product_id']);
  await qi.addIndex('stock_levels', ['warehouse_id']);

  // ── stock_movements ────────────────────────────────────────────────────────
  await qi.createTable('stock_movements', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    product_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'products', key: 'id' }, onDelete: 'CASCADE',
    },
    warehouse_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'warehouses', key: 'id' }, onDelete: 'CASCADE',
    },
    movement_type: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantity_before: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantity_after: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    reference_id: { type: DataTypes.UUID, allowNull: true },
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('stock_movements', ['product_id']);
  await qi.addIndex('stock_movements', ['warehouse_id']);
  await qi.addIndex('stock_movements', ['movement_type']);
  await qi.addIndex('stock_movements', ['reference_id', 'reference_type']);
  await qi.addIndex('stock_movements', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('stock_movements');
  await qi.dropTable('stock_levels');
  await qi.dropTable('warehouses');
  await qi.dropTable('products');
  await qi.dropTable('product_categories');
}
