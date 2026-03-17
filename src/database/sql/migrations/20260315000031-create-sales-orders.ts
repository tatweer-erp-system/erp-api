import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('sales_orders', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    contactId: { type: DataTypes.UUID, allowNull: true },
    branchId: { type: DataTypes.UUID, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    zatcaUUID: { type: DataTypes.UUID, allowNull: true },
    zatcaInvoiceCounter: { type: DataTypes.INTEGER, allowNull: true },
    zatcaHash: { type: DataTypes.TEXT, allowNull: true },
    zatcaQRCode: { type: DataTypes.TEXT, allowNull: true },
    zatcaSignature: { type: DataTypes.TEXT, allowNull: true },
    zatcaSubmittedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    zatcaClearedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    zatcaStatus: { type: DataTypes.STRING(20), allowNull: true },
    invoiceType: { type: DataTypes.STRING(20), defaultValue: 'standard' },
    transactionType: { type: DataTypes.STRING(20), defaultValue: 'invoice' },
    supplyType: { type: DataTypes.STRING(20), defaultValue: 'goods' },
    taxCategory: { type: DataTypes.STRING(5), defaultValue: 'S' },
    taxExemptionCode: { type: DataTypes.STRING(50), allowNull: true },
    taxExemptionReason: { type: DataTypes.STRING(255), allowNull: true },
    originalInvoiceId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('sales_orders', ['tenantId']);
  await qi.addIndex('sales_orders', ['orderNumber'], { unique: true });
  await qi.addIndex('sales_orders', ['tenantId', 'status']);
  await qi.addIndex('sales_orders', ['contactId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('sales_orders');
}
