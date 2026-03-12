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
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    warehouse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE',
    },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
    reserved_quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('stock_levels', ['tenant_id', 'product_id', 'warehouse_id'], {
    unique: true,
    name: 'stock_levels_tenant_product_warehouse_unique',
  });
  await qi.addIndex('stock_levels', ['tenant_id']);
  await qi.addIndex('stock_levels', ['product_id']);
  await qi.addIndex('stock_levels', ['warehouse_id']);

  // ── stock_movements ────────────────────────────────────────────────────────
  await qi.createTable('stock_movements', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    warehouse_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'warehouses', key: 'id' },
      onDelete: 'CASCADE',
    },
    movement_type: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantity_before: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantity_after: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    reference_id: { type: DataTypes.UUID, allowNull: true },
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
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

  await qi.addIndex('stock_movements', ['tenant_id']);
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
}
