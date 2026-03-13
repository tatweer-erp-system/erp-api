import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── stock_levels ───────────────────────────────────────────────────────────
  await qi.createTable('stock_levels', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE',
    },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
    reservedQuantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('stock_levels', ['tenantId', 'productId', 'warehouseId'], {
    unique: true,
    name: 'stock_levels_tenant_product_warehouse_unique',
  });
  await qi.addIndex('stock_levels', ['tenantId']);
  await qi.addIndex('stock_levels', ['productId']);
  await qi.addIndex('stock_levels', ['warehouseId']);

  // ── stock_movements ────────────────────────────────────────────────────────
  await qi.createTable('stock_movements', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE',
    },
    movementType: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantityBefore: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantityAfter: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    referenceType: { type: DataTypes.STRING(50), allowNull: true },
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

  await qi.addIndex('stock_movements', ['tenantId']);
  await qi.addIndex('stock_movements', ['productId']);
  await qi.addIndex('stock_movements', ['warehouseId']);
  await qi.addIndex('stock_movements', ['movementType']);
  await qi.addIndex('stock_movements', ['referenceId', 'referenceType']);
  await qi.addIndex('stock_movements', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('stock_movements');
  await qi.dropTable('stock_levels');
}
