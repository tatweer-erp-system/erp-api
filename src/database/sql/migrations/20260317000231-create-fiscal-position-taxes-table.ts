import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'fiscal_position_taxes', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      fiscalPositionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'fiscal_positions', key: 'id' },
        onDelete: 'CASCADE',
      },
      taxSrcId: { type: DataTypes.UUID, allowNull: false },
      taxDestId: { type: DataTypes.UUID, allowNull: true },
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

  const table = { tableName: 'fiscal_position_taxes', schema: 'public' };

  await qi.addIndex(table, ['tenantId']);
  await qi.addIndex(table, ['fiscalPositionId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize
    .getQueryInterface()
    .dropTable({ tableName: 'fiscal_position_taxes', schema: 'public' });
}
