import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── Products: add account & UOM columns ──────────────────────────────────
  await qi.addColumn('products', 'brandId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'purchaseUomId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'incomeAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'cogsAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'inventoryAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'stockInputAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('products', 'stockOutputAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });

  await qi.addIndex('products', ['tenantId', 'brandId'], {
    where: { deletedAt: null },
  });
  await qi.addIndex('products', ['tenantId', 'productType'], {
    where: { deletedAt: null },
  });

  // ── Product Categories: add default account columns ──────────────────────
  await qi.addColumn('product_categories', 'incomeAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('product_categories', 'cogsAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await qi.addColumn('product_categories', 'inventoryAccountId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Products
  await qi.removeColumn('products', 'brandId');
  await qi.removeColumn('products', 'purchaseUomId');
  await qi.removeColumn('products', 'incomeAccountId');
  await qi.removeColumn('products', 'cogsAccountId');
  await qi.removeColumn('products', 'inventoryAccountId');
  await qi.removeColumn('products', 'stockInputAccountId');
  await qi.removeColumn('products', 'stockOutputAccountId');

  // Product Categories
  await qi.removeColumn('product_categories', 'incomeAccountId');
  await qi.removeColumn('product_categories', 'cogsAccountId');
  await qi.removeColumn('product_categories', 'inventoryAccountId');
}
