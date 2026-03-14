import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('fiscal_periods', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    fiscalYear: { type: DataTypes.INTEGER, allowNull: false },
    periodNumber: { type: DataTypes.INTEGER, allowNull: false },
    periodType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'monthly' },
    nameEn: { type: DataTypes.STRING(100), allowNull: false },
    nameAr: { type: DataTypes.STRING(100), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    closedBy: { type: DataTypes.UUID, allowNull: true },
    closedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('fiscal_periods', ['tenantId', 'fiscalYear', 'periodNumber'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('fiscal_periods');
}
