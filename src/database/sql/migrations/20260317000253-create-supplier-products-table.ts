import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('supplier_products', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    minQty: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(18, 4), allowNull: false },
    currencyId: { type: DataTypes.UUID, allowNull: true },
    leadTimeDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
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

  await qi.addIndex('supplier_products', ['tenantId']);
  await qi.addIndex('supplier_products', ['tenantId', 'productId', 'partnerId'], {
    unique: true,
    where: { deletedAt: null },
    name: 'uq_supplier_products_tenant_product_partner',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('supplier_products');
}
