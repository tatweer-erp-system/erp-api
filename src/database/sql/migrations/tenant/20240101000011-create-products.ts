import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── product_categories ─────────────────────────────────────────────────────
  await qi.createTable('product_categories', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    parent_id: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('product_categories', ['tenant_id']);
  await qi.addIndex('product_categories', ['parent_id']);

  // ── products ───────────────────────────────────────────────────────────────
  await qi.createTable('products', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    sku: { type: DataTypes.STRING(100), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_categories', key: 'id' },
      onDelete: 'SET NULL',
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

  await qi.addIndex('products', ['tenant_id']);
  await qi.addIndex('products', ['category_id']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique" ON "products" ("sku") WHERE "sku" IS NOT NULL AND "deleted_at" IS NULL',
  );
  await qi.addIndex('products', ['barcode']);
  await qi.addIndex('products', ['is_active']);
  await qi.addIndex('products', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('products');
  await qi.dropTable('product_categories');
}
