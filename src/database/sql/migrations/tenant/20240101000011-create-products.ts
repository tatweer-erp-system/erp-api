import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── product_categories ─────────────────────────────────────────────────────
  await qi.createTable('product_categories', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    parentId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('product_categories', ['tenantId']);
  await qi.addIndex('product_categories', ['parentId']);

  // ── products ───────────────────────────────────────────────────────────────
  await qi.createTable('products', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    description: { type: DataTypes.JSONB, allowNull: true },
    sku: { type: DataTypes.STRING(100), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_categories', key: 'id' },
      onDelete: 'SET NULL',
    },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    unitOfMeasure: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
    reorderPoint: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    images: { type: DataTypes.JSONB, allowNull: true },
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

  await qi.addIndex('products', ['tenantId']);
  await qi.addIndex('products', ['categoryId']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique" ON "products" ("sku") WHERE "sku" IS NOT NULL AND "deletedAt" IS NULL',
  );
  await qi.addIndex('products', ['barcode']);
  await qi.addIndex('products', ['isActive']);
  await qi.addIndex('products', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('products');
  await qi.dropTable('product_categories');
}
