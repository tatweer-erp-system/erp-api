import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('products', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    descriptionEn: { type: DataTypes.STRING(500), allowNull: true },
    descriptionAr: { type: DataTypes.STRING(500), allowNull: true },
    sku: { type: DataTypes.STRING(100), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true },
    categoryId: { type: DataTypes.UUID, allowNull: true },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    unitOfMeasure: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pcs' },
    reorderPoint: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    images: { type: DataTypes.JSONB, allowNull: true },
    productType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'storable' },
    invoicePolicy: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ordered' },
    canBeSold: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    canBePurchased: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    hasVariants: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hasSerialTracking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hasLotTracking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hasExpiryDate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    reorderMinQty: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
    reorderQty: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
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

  await qi.addIndex('products', ['tenantId']);
  await qi.addIndex('products', ['tenantId', 'sku']);
  await qi.addIndex('products', ['tenantId', 'barcode']);
  await qi.addIndex('products', ['categoryId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('products');
}
