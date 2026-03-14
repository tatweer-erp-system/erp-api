import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('exchange_rates', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    fromCurrencyId: { type: DataTypes.UUID, allowNull: false },
    toCurrencyId: { type: DataTypes.UUID, allowNull: false },
    rate: { type: DataTypes.DECIMAL(15, 6), allowNull: false },
    rateDate: { type: DataTypes.DATEONLY, allowNull: false },
    source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'manual' },
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
  });

  await qi.addIndex('exchange_rates', ['tenantId', 'fromCurrencyId', 'toCurrencyId', 'rateDate']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('exchange_rates');
}
