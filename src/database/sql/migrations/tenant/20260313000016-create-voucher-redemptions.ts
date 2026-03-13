import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('voucher_redemptions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    voucher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'vouchers', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    discount_applied: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    redeemed_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('voucher_redemptions', ['voucher_id']);
  await qi.addIndex('voucher_redemptions', ['order_id']);
  await qi.addIndex('voucher_redemptions', ['customer_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('voucher_redemptions');
}
