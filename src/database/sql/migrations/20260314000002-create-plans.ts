import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('plans', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    descriptionEn: { type: DataTypes.STRING(500), allowNull: true },
    descriptionAr: { type: DataTypes.STRING(500), allowNull: true },
    monthlyPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    annualPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'SAR' },
    modules: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    maxUsers: { type: DataTypes.INTEGER, allowNull: true },
    features: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
  });

  await qi.addIndex('plans', ['slug'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('plans');
}
