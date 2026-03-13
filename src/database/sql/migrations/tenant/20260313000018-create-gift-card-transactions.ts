import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('gift_card_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    gift_card_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'gift_cards', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    balance_after: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('gift_card_transactions', ['gift_card_id']);
  await qi.addIndex('gift_card_transactions', ['type']);
  await qi.addIndex('gift_card_transactions', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('gift_card_transactions');
}
