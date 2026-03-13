import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('treasury_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    type: { type: DataTypes.STRING(20), allowNull: false },
    bank_name: { type: DataTypes.STRING(100), allowNull: true },
    account_number: { type: DataTypes.STRING(50), allowNull: true },
    iban: { type: DataTypes.STRING(34), allowNull: true },
    swift_code: { type: DataTypes.STRING(11), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    coa_account_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'chart_of_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  await qi.addIndex('treasury_accounts', ['tenant_id']);
  await qi.addIndex('treasury_accounts', ['type']);
  await qi.addIndex('treasury_accounts', ['is_active']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('treasury_accounts');
}
