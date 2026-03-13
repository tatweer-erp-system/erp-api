import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('bank_reconciliations', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'treasury_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    statementDate: { type: DataTypes.DATEONLY, allowNull: false },
    openingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    closingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    systemBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    difference: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_progress' },
    reconciledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    completedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('bank_reconciliations', ['accountId']);
  await qi.addIndex('bank_reconciliations', ['statementDate']);
  await qi.addIndex('bank_reconciliations', ['status']);

  // Add FK on treasury_transactions.reconciliationId → bank_reconciliations
  await sequelize.query(
    'ALTER TABLE "treasury_transactions" ADD CONSTRAINT "fk_treasury_transactions_reconciliation" FOREIGN KEY ("reconciliationId") REFERENCES "bank_reconciliations"("id") ON DELETE SET NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(
    'ALTER TABLE "treasury_transactions" DROP CONSTRAINT IF EXISTS "fk_treasury_transactions_reconciliation"',
  );
  await sequelize.getQueryInterface().dropTable('bank_reconciliations');
}
