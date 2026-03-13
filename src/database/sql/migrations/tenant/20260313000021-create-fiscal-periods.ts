import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('fiscal_periods', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    fiscalYear: { type: DataTypes.INTEGER, allowNull: false },
    periodNumber: { type: DataTypes.INTEGER, allowNull: false },
    periodType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'monthly' },
    name: { type: DataTypes.STRING(50), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    closedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
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

  await qi.addIndex('fiscal_periods', ['tenantId']);
  await qi.addIndex('fiscal_periods', ['fiscalYear']);
  await qi.addIndex('fiscal_periods', ['status']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_year_num_type_unique" ON "fiscal_periods" ("tenantId", "fiscalYear", "periodNumber", "periodType")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "fiscal_periods_year_num_type_unique"');
  await sequelize.getQueryInterface().dropTable('fiscal_periods');
}
