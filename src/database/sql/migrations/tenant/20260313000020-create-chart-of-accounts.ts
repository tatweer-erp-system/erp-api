import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('chart_of_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    type: { type: DataTypes.STRING(20), allowNull: false },
    subType: { type: DataTypes.STRING(50), allowNull: true },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'chart_of_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    normalBalance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'debit' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    allowDirectPosting: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    openingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    openingBalanceDate: { type: DataTypes.DATEONLY, allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
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
    deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('chart_of_accounts', ['tenantId']);
  await qi.addIndex('chart_of_accounts', ['parentId']);
  await qi.addIndex('chart_of_accounts', ['type']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "coa_code_tenant_unique" ON "chart_of_accounts" ("tenantId", "code") WHERE "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "coa_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('chart_of_accounts');
}
