import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('receipt_lines', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    receiptId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'receipts', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    purchaseOrderLineId: { type: DataTypes.UUID, allowNull: true },
    stockMoveId: { type: DataTypes.UUID, allowNull: true },
    productVariantId: { type: DataTypes.UUID, allowNull: true },
    qtyDemand: { type: DataTypes.DECIMAL(18, 4), allowNull: false },
    qtyDone: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    unitOfMeasureId: { type: DataTypes.UUID, allowNull: true },
    locationId: { type: DataTypes.UUID, allowNull: true },
    lotNumber: { type: DataTypes.STRING(100), allowNull: true },
    serialNumber: { type: DataTypes.STRING(100), allowNull: true },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
    unitCost: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
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
    deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('receipt_lines', ['tenantId']);
  await qi.addIndex('receipt_lines', ['receiptId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('receipt_lines');
}
