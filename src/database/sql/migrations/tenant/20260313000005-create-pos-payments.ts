import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // IMMUTABLE TABLE — no audit cols
  await qi.createTable('pos_payments', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    method: { type: DataTypes.STRING(30), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    amountGiven: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    changeAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    // FK added by Agent B ALTER migration to gift_cards
    giftCardId: { type: DataTypes.UUID, allowNull: true },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('pos_payments', ['orderId']);
  await qi.addIndex('pos_payments', ['method']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_payments');
}
