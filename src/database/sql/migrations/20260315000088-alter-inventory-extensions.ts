import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const stockLevelsTable = { tableName: 'stock_levels', schema: 'public' };
  const stockMovementsTable = { tableName: 'stock_movements', schema: 'public' };

  // ── stock_levels additions ──────────────────────────────────────────────────
  await qi.addColumn(stockLevelsTable, 'averageCost', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(stockLevelsTable, 'lastCostPrice', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(stockLevelsTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  // ── stock_movements additions ───────────────────────────────────────────────
  await qi.addColumn(stockMovementsTable, 'unitCost', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(stockMovementsTable, 'totalCost', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(stockMovementsTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(stockMovementsTable, 'lotNumber', {
    type: DataTypes.STRING(100),
    allowNull: true,
  });

  await qi.addColumn(stockMovementsTable, 'serialNumber', {
    type: DataTypes.STRING(100),
    allowNull: true,
  });

  await qi.addColumn(stockMovementsTable, 'expiryDate', {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });

  await qi.addColumn(stockMovementsTable, 'branchId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'branches', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const stockLevelsTable = { tableName: 'stock_levels', schema: 'public' };
  const stockMovementsTable = { tableName: 'stock_movements', schema: 'public' };

  // ── stock_movements removals ────────────────────────────────────────────────
  await qi.removeColumn(stockMovementsTable, 'branchId');
  await qi.removeColumn(stockMovementsTable, 'expiryDate');
  await qi.removeColumn(stockMovementsTable, 'serialNumber');
  await qi.removeColumn(stockMovementsTable, 'lotNumber');
  await qi.removeColumn(stockMovementsTable, 'currencyId');
  await qi.removeColumn(stockMovementsTable, 'totalCost');
  await qi.removeColumn(stockMovementsTable, 'unitCost');

  // ── stock_levels removals ───────────────────────────────────────────────────
  await qi.removeColumn(stockLevelsTable, 'currencyId');
  await qi.removeColumn(stockLevelsTable, 'lastCostPrice');
  await qi.removeColumn(stockLevelsTable, 'averageCost');
}
