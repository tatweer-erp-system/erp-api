import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pricelist_items', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    pricelistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pricelists', key: 'id' },
      onDelete: 'CASCADE',
    },
    applyOn: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
    productId: { type: DataTypes.UUID, allowNull: true },
    categoryId: { type: DataTypes.UUID, allowNull: true },
    minQty: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    computation: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'fixed' },
    price: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
    discountPct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('pricelist_items', ['tenantId']);
  await qi.addIndex('pricelist_items', ['pricelistId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('pricelist_items');
}
