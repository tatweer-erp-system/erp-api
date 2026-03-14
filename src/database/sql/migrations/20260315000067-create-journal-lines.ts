import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('journal_lines', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    entryId: { type: DataTypes.UUID, allowNull: false },
    accountId: { type: DataTypes.UUID, allowNull: false },
    debit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    credit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.TEXT, allowNull: true },
    costCenterId: { type: DataTypes.UUID, allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    exchangeRate: { type: DataTypes.DECIMAL(15, 6), allowNull: true, defaultValue: 1 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('journal_lines', ['entryId']);
  await qi.addIndex('journal_lines', ['accountId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('journal_lines');
}
