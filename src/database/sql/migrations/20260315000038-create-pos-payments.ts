import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_payments', {
    id: { type: DataTypes.UUID, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    method: { type: DataTypes.STRING(30), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    amountGiven: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    changeAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    giftCardId: { type: DataTypes.UUID, allowNull: true },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('pos_payments', ['orderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_payments');
}
