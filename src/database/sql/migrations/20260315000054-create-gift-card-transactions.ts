import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('gift_card_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    giftCardId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    balanceAfter: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('gift_card_transactions', ['giftCardId']);
  await qi.addIndex('gift_card_transactions', ['orderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('gift_card_transactions');
}
