import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'fiscal_positions', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      nameEn: { type: DataTypes.STRING(255), allowNull: false },
      nameAr: { type: DataTypes.STRING(255), allowNull: false },
      autoDetect: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      country: { type: DataTypes.STRING(100), allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
  );

  const table = { tableName: 'fiscal_positions', schema: 'public' };

  await qi.addIndex(table, ['tenantId']);
  await qi.addIndex(table, ['tenantId', 'autoDetect']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize
    .getQueryInterface()
    .dropTable({ tableName: 'fiscal_positions', schema: 'public' });
}
