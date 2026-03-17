import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('stock_locations', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    warehouseId: { type: DataTypes.UUID, allowNull: true },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    fullName: { type: DataTypes.STRING(500), allowNull: true },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'stock_locations', key: 'id' },
      onDelete: 'SET NULL',
    },
    locationType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'internal' },
    isScrap: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isReturn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  await qi.addIndex('stock_locations', ['tenantId']);
  await qi.addIndex('stock_locations', ['tenantId', 'warehouseId']);
  await qi.addIndex('stock_locations', ['tenantId', 'locationType']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('stock_locations');
}
