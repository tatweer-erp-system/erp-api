import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('restaurant_tables', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    sectionId: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.STRING(20), allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    minCapacity: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'available' },
    posX: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    posY: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    shape: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'square' },
    width: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 80 },
    height: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 80 },
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

  await qi.addIndex('restaurant_tables', ['sectionId']);
  await qi.addIndex('restaurant_tables', ['sectionId', 'number']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('restaurant_tables');
}
