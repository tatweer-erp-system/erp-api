import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('bank_statement_lines', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    statementId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'bank_statements', key: 'id' },
      onDelete: 'CASCADE',
    },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    reference: { type: DataTypes.STRING(255), allowNull: true },
    partnerName: { type: DataTypes.STRING(255), allowNull: true },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    isReconciled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    journalEntryId: { type: DataTypes.UUID, allowNull: true },
    paymentId: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('bank_statement_lines', ['tenantId']);
  await qi.addIndex('bank_statement_lines', ['statementId']);
  await qi.addIndex('bank_statement_lines', ['tenantId', 'isReconciled']);
  await qi.addIndex('bank_statement_lines', ['journalEntryId']);
  await qi.addIndex('bank_statement_lines', ['paymentId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('bank_statement_lines');
}
