import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('treasury_transactions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'treasury_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(30), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    exchangeRate: { type: DataTypes.DECIMAL(15, 6), allowNull: true, defaultValue: 1.0 },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isReconciled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    reconciliationId: { type: DataTypes.UUID, allowNull: true },
    journalEntryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
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

  await qi.addIndex('treasury_transactions', ['tenantId']);
  await qi.addIndex('treasury_transactions', ['accountId']);
  await qi.addIndex('treasury_transactions', ['date']);
  await qi.addIndex('treasury_transactions', ['isReconciled']);
  await qi.addIndex('treasury_transactions', ['type']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('treasury_transactions');
}
