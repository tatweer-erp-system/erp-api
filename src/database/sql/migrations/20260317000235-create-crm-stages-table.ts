import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'crm_stages', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      nameEn: { type: DataTypes.STRING(255), allowNull: false },
      nameAr: { type: DataTypes.STRING(255), allowNull: false },
      sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      probability: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 20 },
      isWon: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isFolded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  const table = { tableName: 'crm_stages', schema: 'public' };

  await qi.addIndex(table, ['tenantId']);
  await qi.addIndex(table, ['tenantId', 'sequence']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable({ tableName: 'crm_stages', schema: 'public' });
}
