import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── purchase_orders ──────────────────────────────────────────────────────
  const poTable = { tableName: 'purchase_orders', schema: 'public' };

  await qi.addColumn(poTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(poTable, 'exchangeRate', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1,
  });

  await qi.addColumn(poTable, 'totalAmountBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(poTable, 'discountAmount', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(poTable, 'receivedAt', {
    type: 'TIMESTAMPTZ' as any,
    allowNull: true,
  });

  await qi.addColumn(poTable, 'invoiceNumber', {
    type: DataTypes.STRING(100),
    allowNull: true,
  });

  // ── purchase_order_lines ─────────────────────────────────────────────────
  const polTable = { tableName: 'purchase_order_lines', schema: 'public' };

  await qi.addColumn(polTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(polTable, 'lineTotalBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(polTable, 'receivedQuantity', {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
    defaultValue: 0,
  });

  await qi.addColumn(polTable, 'discountAmount', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  });

  // ── vendors ──────────────────────────────────────────────────────────────
  const vendorTable = { tableName: 'vendors', schema: 'public' };

  await qi.addColumn(vendorTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(vendorTable, 'paymentTermsDays', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  });

  await qi.addColumn(vendorTable, 'vatNumber', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  await qi.addColumn(vendorTable, 'crNumber', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  await qi.addColumn(vendorTable, 'bankName', {
    type: DataTypes.STRING(100),
    allowNull: true,
  });

  await qi.addColumn(vendorTable, 'bankIban', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  await qi.addColumn(vendorTable, 'rating', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  // Add CHECK constraint for rating
  await sequelize.query(
    `ALTER TABLE vendors ADD CONSTRAINT vendors_rating_check CHECK (rating BETWEEN 1 AND 5)`,
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── vendors ──────────────────────────────────────────────────────────────
  await sequelize.query(`ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_rating_check`);
  const vendorTable = { tableName: 'vendors', schema: 'public' };
  await qi.removeColumn(vendorTable, 'rating');
  await qi.removeColumn(vendorTable, 'bankIban');
  await qi.removeColumn(vendorTable, 'bankName');
  await qi.removeColumn(vendorTable, 'crNumber');
  await qi.removeColumn(vendorTable, 'vatNumber');
  await qi.removeColumn(vendorTable, 'paymentTermsDays');
  await qi.removeColumn(vendorTable, 'currencyId');

  // ── purchase_order_lines ─────────────────────────────────────────────────
  const polTable = { tableName: 'purchase_order_lines', schema: 'public' };
  await qi.removeColumn(polTable, 'discountAmount');
  await qi.removeColumn(polTable, 'receivedQuantity');
  await qi.removeColumn(polTable, 'lineTotalBase');
  await qi.removeColumn(polTable, 'currencyId');

  // ── purchase_orders ──────────────────────────────────────────────────────
  const poTable = { tableName: 'purchase_orders', schema: 'public' };
  await qi.removeColumn(poTable, 'invoiceNumber');
  await qi.removeColumn(poTable, 'receivedAt');
  await qi.removeColumn(poTable, 'discountAmount');
  await qi.removeColumn(poTable, 'totalAmountBase');
  await qi.removeColumn(poTable, 'exchangeRate');
  await qi.removeColumn(poTable, 'currencyId');
}
