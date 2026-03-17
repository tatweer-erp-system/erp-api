import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('taxes', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'percentage' },
    amount: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 15.0 },
    scope: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'both' },
    includeInPrice: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    taxGroupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'tax_groups', key: 'id' },
      onDelete: 'SET NULL',
    },
    saleAccountId: { type: DataTypes.UUID, allowNull: true },
    purchaseAccountId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('taxes', ['tenantId']);
  await qi.addIndex('taxes', ['tenantId', 'scope']);
  await qi.addIndex('taxes', ['tenantId', 'isActive']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('taxes');
}
