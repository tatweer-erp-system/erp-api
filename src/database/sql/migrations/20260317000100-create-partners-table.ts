import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('partners', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'customer' },
    isCustomer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isSupplier: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    taxNumber: { type: DataTypes.STRING(50), allowNull: true },
    vatNumber: { type: DataTypes.STRING(50), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    mobile: { type: DataTypes.STRING(50), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    website: { type: DataTypes.STRING(255), allowNull: true },
    street: { type: DataTypes.STRING(500), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Saudi Arabia' },
    zip: { type: DataTypes.STRING(20), allowNull: true },
    creditLimit: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    paymentTermId: { type: DataTypes.UUID, allowNull: true },
    pricelistId: { type: DataTypes.UUID, allowNull: true },
    arAccountId: { type: DataTypes.UUID, allowNull: true },
    apAccountId: { type: DataTypes.UUID, allowNull: true },
    fiscalPositionId: { type: DataTypes.UUID, allowNull: true },
    bankIban: { type: DataTypes.STRING(50), allowNull: true },
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('partners', ['tenantId']);
  await qi.addIndex('partners', ['tenantId', 'type']);
  await qi.addIndex('partners', ['tenantId', 'isCustomer']);
  await qi.addIndex('partners', ['tenantId', 'isSupplier']);
  await qi.addIndex('partners', ['tenantId', 'email']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('partners');
}
