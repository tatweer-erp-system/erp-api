import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('journal_lines', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    entry_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'chart_of_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    debit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    credit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    description: { type: DataTypes.TEXT, allowNull: true },
    cost_center_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'cost_centers', key: 'id' },
      onDelete: 'SET NULL',
    },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    exchange_rate: { type: DataTypes.DECIMAL(15, 6), allowNull: true, defaultValue: 1.0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('journal_lines', ['entry_id']);
  await qi.addIndex('journal_lines', ['account_id']);
  await qi.addIndex('journal_lines', ['cost_center_id']);

  await sequelize.query(
    'ALTER TABLE "journal_lines" ADD CONSTRAINT "chk_journal_lines_debit_credit_exclusive" CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(
    'ALTER TABLE "journal_lines" DROP CONSTRAINT IF EXISTS "chk_journal_lines_debit_credit_exclusive"',
  );
  await sequelize.getQueryInterface().dropTable('journal_lines');
}
