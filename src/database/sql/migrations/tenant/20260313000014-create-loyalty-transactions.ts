import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(20), allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    balanceAfter: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
    expiresAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('loyalty_transactions', ['accountId']);
  await qi.addIndex('loyalty_transactions', ['type']);
  await qi.addIndex('loyalty_transactions', ['expiresAt']);
  await qi.addIndex('loyalty_transactions', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_transactions');
}
