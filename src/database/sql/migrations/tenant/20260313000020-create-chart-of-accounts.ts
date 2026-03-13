import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('chart_of_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    type: { type: DataTypes.STRING(20), allowNull: false },
    sub_type: { type: DataTypes.STRING(50), allowNull: true },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'chart_of_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    normal_balance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'debit' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    allow_direct_posting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    opening_balance_date: { type: DataTypes.DATEONLY, allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
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
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('chart_of_accounts', ['tenant_id']);
  await qi.addIndex('chart_of_accounts', ['parent_id']);
  await qi.addIndex('chart_of_accounts', ['type']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "coa_code_tenant_unique" ON "chart_of_accounts" ("tenant_id", "code") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "coa_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('chart_of_accounts');
}
