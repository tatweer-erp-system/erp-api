import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const ordersTable = { tableName: 'pos_orders', schema: 'public' };
  const paymentsTable = { tableName: 'pos_payments', schema: 'public' };

  await qi.addColumn(ordersTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(ordersTable, 'exchangeRate', {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1,
  });

  await qi.addColumn(ordersTable, 'totalAmountBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(paymentsTable, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const ordersTable = { tableName: 'pos_orders', schema: 'public' };
  const paymentsTable = { tableName: 'pos_payments', schema: 'public' };

  await qi.removeColumn(paymentsTable, 'currencyId');
  await qi.removeColumn(ordersTable, 'totalAmountBase');
  await qi.removeColumn(ordersTable, 'exchangeRate');
  await qi.removeColumn(ordersTable, 'currencyId');
}
