import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('stock_movements', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    warehouseId: { type: DataTypes.UUID, allowNull: false },
    movementType: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantityBefore: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    quantityAfter: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    referenceType: { type: DataTypes.STRING(50), allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updatedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('stock_movements', ['tenantId', 'productId']);
  await qi.addIndex('stock_movements', ['tenantId', 'warehouseId']);
  await qi.addIndex('stock_movements', ['referenceId', 'referenceType']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('stock_movements');
}
