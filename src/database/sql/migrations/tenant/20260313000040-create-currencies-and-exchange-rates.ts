import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // 1. currencies table
  await qi.createTable('currencies', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(3), allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false },
    symbol: { type: DataTypes.STRING(10), allowNull: false },
    isBase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    decimalPlaces: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
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

  await qi.addIndex('currencies', ['tenantId', 'code'], {
    unique: true,
    name: 'currencies_tenantId_code_unique',
  });

  // Partial unique index for single base currency per tenant
  await sequelize.query(
    `CREATE UNIQUE INDEX "currencies_tenantId_isBase_unique" ON currencies ("tenantId", "isBase") WHERE "isBase" = true`,
  );

  // 2. exchange_rates table
  await qi.createTable('exchange_rates', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    fromCurrencyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'currencies', key: 'id' },
      onDelete: 'CASCADE',
    },
    toCurrencyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'currencies', key: 'id' },
      onDelete: 'CASCADE',
    },
    rate: { type: DataTypes.DECIMAL(15, 6), allowNull: false },
    rateDate: { type: DataTypes.DATEONLY, allowNull: false },
    source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'manual' },
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
  });

  await qi.addIndex('exchange_rates', ['tenantId', 'fromCurrencyId', 'toCurrencyId', 'rateDate'], {
    unique: true,
    name: 'exchange_rates_unique',
  });
  await qi.addIndex('exchange_rates', ['tenantId']);

  // 3. Add currencyId + exchangeRate to pos_orders
  await qi.addColumn('pos_orders', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'currencies', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addColumn('pos_orders', 'exchangeRate', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1,
  });

  // 4. Add currencyId + amountBase to pos_payments
  await qi.addColumn('pos_payments', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'currencies', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addColumn('pos_payments', 'amountBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  // 5. Add currencyId to gift_cards
  await qi.addColumn('gift_cards', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'currencies', key: 'id' },
    onDelete: 'SET NULL',
  });

  // 6. Add currencyId + currentBalanceBase to treasury_accounts
  await qi.addColumn('treasury_accounts', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'currencies', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addColumn('treasury_accounts', 'currentBalanceBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  // 7. Add currencyId + amountBase + exchangeRate to treasury_transactions
  await qi.addColumn('treasury_transactions', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'currencies', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addColumn('treasury_transactions', 'amountBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });
  await qi.addColumn('treasury_transactions', 'exchangeRate', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1,
  });

  // 8. Add currencyId to sales_orders (keep existing currency VARCHAR column)
  await qi.addColumn('sales_orders', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
  });

  // 9. Add currencyId to purchase_orders (keep existing currency VARCHAR column)
  await qi.addColumn('purchase_orders', 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.removeColumn('purchase_orders', 'currencyId');
  await qi.removeColumn('sales_orders', 'currencyId');
  await qi.removeColumn('treasury_transactions', 'exchangeRate');
  await qi.removeColumn('treasury_transactions', 'amountBase');
  await qi.removeColumn('treasury_transactions', 'currencyId');
  await qi.removeColumn('treasury_accounts', 'currentBalanceBase');
  await qi.removeColumn('treasury_accounts', 'currencyId');
  await qi.removeColumn('gift_cards', 'currencyId');
  await qi.removeColumn('pos_payments', 'amountBase');
  await qi.removeColumn('pos_payments', 'currencyId');
  await qi.removeColumn('pos_orders', 'exchangeRate');
  await qi.removeColumn('pos_orders', 'currencyId');
  await qi.dropTable('exchange_rates');
  await sequelize.query(`DROP INDEX IF EXISTS "currencies_tenantId_isBase_unique"`);
  await qi.dropTable('currencies');
}
