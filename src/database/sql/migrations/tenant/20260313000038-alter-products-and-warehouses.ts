import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── Products table changes ─────────────────────────────────────────────────

  await qi.addColumn('products', 'productType', {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'storable',
  });
  await sequelize.query(`
    ALTER TABLE "products"
    ADD CONSTRAINT "products_product_type_check"
    CHECK ("productType" IN ('storable', 'consumable', 'service'))
  `);

  await qi.addColumn('products', 'invoicePolicy', {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ordered',
  });
  await sequelize.query(`
    ALTER TABLE "products"
    ADD CONSTRAINT "products_invoice_policy_check"
    CHECK ("invoicePolicy" IN ('ordered', 'delivered'))
  `);

  await qi.addColumn('products', 'canBeSold', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  await qi.addColumn('products', 'canBePurchased', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  await qi.addColumn('products', 'hasVariants', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await qi.addColumn('products', 'hasSerialTracking', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await qi.addColumn('products', 'hasLotTracking', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await qi.addColumn('products', 'hasExpiryDate', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await qi.addColumn('products', 'reorderMinQty', {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: null,
  });

  await qi.addColumn('products', 'reorderQty', {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: null,
  });

  // ── Warehouses table changes ───────────────────────────────────────────────

  await qi.addColumn('warehouses', 'allowNegativeStock', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // ── pos_orders table changes ───────────────────────────────────────────────
  // Note: pricelists table does not exist yet — FK will be added in a future wave

  await qi.addColumn('pos_orders', 'pricelistId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addIndex('pos_orders', ['pricelistId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Reverse pos_orders changes
  await qi.removeIndex('pos_orders', ['pricelistId']);
  await qi.removeColumn('pos_orders', 'pricelistId');

  // Reverse warehouses changes
  await qi.removeColumn('warehouses', 'allowNegativeStock');

  // Reverse products changes
  await qi.removeColumn('products', 'reorderQty');
  await qi.removeColumn('products', 'reorderMinQty');
  await qi.removeColumn('products', 'hasExpiryDate');
  await qi.removeColumn('products', 'hasLotTracking');
  await qi.removeColumn('products', 'hasSerialTracking');
  await qi.removeColumn('products', 'hasVariants');
  await qi.removeColumn('products', 'canBePurchased');
  await qi.removeColumn('products', 'canBeSold');

  await sequelize.query(
    'ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_invoice_policy_check"',
  );
  await qi.removeColumn('products', 'invoicePolicy');

  await sequelize.query(
    'ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_product_type_check"',
  );
  await qi.removeColumn('products', 'productType');
}
