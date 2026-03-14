import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_tiers', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    programId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(100), allowNull: false },
    nameAr: { type: DataTypes.STRING(100), allowNull: false },
    descriptionEn: { type: DataTypes.TEXT, allowNull: true },
    descriptionAr: { type: DataTypes.TEXT, allowNull: true },
    minPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    earnMultiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1 },
    redeemMultiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1 },
    color: { type: DataTypes.STRING(20), allowNull: true },
    benefits: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    sortOrder: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
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
  });

  await qi.addIndex('loyalty_tiers', ['programId']);
  await qi.addIndex('loyalty_tiers', ['tenantId', 'programId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_tiers');
}
