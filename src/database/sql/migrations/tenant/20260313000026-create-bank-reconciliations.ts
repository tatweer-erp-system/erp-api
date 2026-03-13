import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('bank_reconciliations', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'treasury_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    statement_date: { type: DataTypes.DATEONLY, allowNull: false },
    opening_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    closing_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    system_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    difference: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_progress' },
    reconciled_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    completed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('bank_reconciliations', ['account_id']);
  await qi.addIndex('bank_reconciliations', ['statement_date']);
  await qi.addIndex('bank_reconciliations', ['status']);

  // Add FK on treasury_transactions.reconciliation_id → bank_reconciliations
  await sequelize.query(
    'ALTER TABLE "treasury_transactions" ADD CONSTRAINT "fk_treasury_transactions_reconciliation" FOREIGN KEY ("reconciliation_id") REFERENCES "bank_reconciliations"("id") ON DELETE SET NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(
    'ALTER TABLE "treasury_transactions" DROP CONSTRAINT IF EXISTS "fk_treasury_transactions_reconciliation"',
  );
  await sequelize.getQueryInterface().dropTable('bank_reconciliations');
}
