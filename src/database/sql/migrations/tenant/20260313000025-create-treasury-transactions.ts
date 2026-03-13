import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('treasury_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'treasury_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(30), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    exchange_rate: { type: DataTypes.DECIMAL(15, 6), allowNull: true, defaultValue: 1.0 },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    contact_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_reconciled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    reconciliation_id: { type: DataTypes.UUID, allowNull: true },
    journal_entry_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
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

  await qi.addIndex('treasury_transactions', ['tenant_id']);
  await qi.addIndex('treasury_transactions', ['account_id']);
  await qi.addIndex('treasury_transactions', ['date']);
  await qi.addIndex('treasury_transactions', ['is_reconciled']);
  await qi.addIndex('treasury_transactions', ['type']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('treasury_transactions');
}
