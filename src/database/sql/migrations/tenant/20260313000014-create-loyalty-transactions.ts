import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(20), allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    balance_after: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
    expires_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('loyalty_transactions', ['account_id']);
  await qi.addIndex('loyalty_transactions', ['type']);
  await qi.addIndex('loyalty_transactions', ['expires_at']);
  await qi.addIndex('loyalty_transactions', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_transactions');
}
