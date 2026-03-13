import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('fiscal_periods', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    fiscal_year: { type: DataTypes.INTEGER, allowNull: false },
    period_number: { type: DataTypes.INTEGER, allowNull: false },
    period_type: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'monthly' },
    name: { type: DataTypes.STRING(50), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    closed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    closed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('fiscal_periods', ['tenant_id']);
  await qi.addIndex('fiscal_periods', ['fiscal_year']);
  await qi.addIndex('fiscal_periods', ['status']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_year_num_type_unique" ON "fiscal_periods" ("tenant_id", "fiscal_year", "period_number", "period_type")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "fiscal_periods_year_num_type_unique"');
  await sequelize.getQueryInterface().dropTable('fiscal_periods');
}
