import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('product_template_attribute_values', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    templateAttributeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'product_template_attributes', key: 'id' },
      onDelete: 'CASCADE',
    },
    attributeValueId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'product_attribute_values', key: 'id' },
      onDelete: 'RESTRICT',
    },
    priceExtra: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('product_template_attribute_values', ['tenantId']);
  await qi.addIndex('product_template_attribute_values', ['templateAttributeId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('product_template_attribute_values');
}
