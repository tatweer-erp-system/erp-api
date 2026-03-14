import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const salesOrdersTable = { tableName: 'sales_orders', schema: 'public' };
  const salesOrderLinesTable = { tableName: 'sales_order_lines', schema: 'public' };

  // ── sales_orders additions ──
  await qi.addColumn(salesOrdersTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(salesOrdersTable, 'exchangeRate', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1,
  });

  await qi.addColumn(salesOrdersTable, 'totalAmountBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(salesOrdersTable, 'discountType', {
    type: DataTypes.STRING(20),
    allowNull: true,
  });

  await qi.addColumn(salesOrdersTable, 'discountValue', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  // ── sales_order_lines additions ──
  await qi.addColumn(salesOrderLinesTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(salesOrderLinesTable, 'lineTotalBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(salesOrderLinesTable, 'discountType', {
    type: DataTypes.STRING(20),
    allowNull: true,
  });

  await qi.addColumn(salesOrderLinesTable, 'discountValue', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const salesOrdersTable = { tableName: 'sales_orders', schema: 'public' };
  const salesOrderLinesTable = { tableName: 'sales_order_lines', schema: 'public' };

  // ── Reverse sales_order_lines ──
  await qi.removeColumn(salesOrderLinesTable, 'discountValue');
  await qi.removeColumn(salesOrderLinesTable, 'discountType');
  await qi.removeColumn(salesOrderLinesTable, 'lineTotalBase');
  await qi.removeColumn(salesOrderLinesTable, 'currencyId');

  // ── Reverse sales_orders ──
  await qi.removeColumn(salesOrdersTable, 'discountValue');
  await qi.removeColumn(salesOrdersTable, 'discountType');
  await qi.removeColumn(salesOrdersTable, 'totalAmountBase');
  await qi.removeColumn(salesOrdersTable, 'exchangeRate');
  await qi.removeColumn(salesOrdersTable, 'currencyId');
}
