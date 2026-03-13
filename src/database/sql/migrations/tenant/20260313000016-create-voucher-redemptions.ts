import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('voucher_redemptions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    voucherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'vouchers', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    discountApplied: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    redeemedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('voucher_redemptions', ['voucherId']);
  await qi.addIndex('voucher_redemptions', ['orderId']);
  await qi.addIndex('voucher_redemptions', ['customerId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('voucher_redemptions');
}
