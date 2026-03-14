import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_order_items', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: true },
    productName: { type: DataTypes.STRING(200), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    discountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    lineTotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    course: { type: DataTypes.STRING(30), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    isFired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    firedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('pos_order_items', ['orderId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pos_order_items');
}
