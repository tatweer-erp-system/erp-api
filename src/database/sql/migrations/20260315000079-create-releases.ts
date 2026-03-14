import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'releases', schema: 'public' },
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      version: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      type: { type: DataTypes.STRING(20), allowNull: false },
      titleEn: { type: DataTypes.STRING(500), allowNull: false },
      titleAr: { type: DataTypes.STRING(500), allowNull: false },
      descriptionEn: { type: DataTypes.TEXT, allowNull: false },
      descriptionAr: { type: DataTypes.TEXT, allowNull: false },
      changes: { type: DataTypes.JSONB, allowNull: false, defaultValue: '[]' },
      tour: { type: DataTypes.JSONB, allowNull: true },
      isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
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
    },
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable({ tableName: 'releases', schema: 'public' });
}
