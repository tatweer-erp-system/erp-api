import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('vouchers', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    descriptionEn: { type: DataTypes.STRING(500), allowNull: true },
    descriptionAr: { type: DataTypes.STRING(500), allowNull: true },
    code: { type: DataTypes.STRING(50), allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: true, defaultValue: 'discount' },
    discountType: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'percent' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    minOrderAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    maxDiscountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    maxUses: { type: DataTypes.INTEGER, allowNull: true },
    usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxUsesPerCustomer: { type: DataTypes.INTEGER, allowNull: true },
    customerId: { type: DataTypes.UUID, allowNull: true },
    validFrom: { type: DataTypes.DATEONLY, allowNull: true },
    validUntil: { type: DataTypes.DATEONLY, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
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

  await qi.addIndex('vouchers', ['tenantId']);
  await qi.addIndex('vouchers', ['tenantId', 'code'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('vouchers');
}
