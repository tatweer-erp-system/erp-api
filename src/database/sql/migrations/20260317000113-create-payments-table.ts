import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  const baseColumns = {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
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
  };

  await qi.createTable('payments', {
    ...baseColumns,
    branchId: { type: DataTypes.UUID, allowNull: false },
    journalId: { type: DataTypes.UUID, allowNull: true },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    paymentType: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    paymentNumber: { type: DataTypes.STRING(50), allowNull: true },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    currencyId: { type: DataTypes.UUID, allowNull: true },
    exchangeRate: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 1,
    },
    amountBase: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    memo: { type: DataTypes.STRING(500), allowNull: true },
    journalEntryId: { type: DataTypes.UUID, allowNull: true },
    treasuryAccountId: { type: DataTypes.UUID, allowNull: true },
  });

  await qi.addIndex('payments', ['tenantId'], {
    name: 'idx_payments_tenant',
  });
  await qi.addIndex('payments', ['tenantId', 'branchId'], {
    name: 'idx_payments_tenant_branch',
  });
  await qi.addIndex('payments', ['tenantId', 'partnerId'], {
    name: 'idx_payments_tenant_partner',
  });
  await qi.addIndex('payments', ['tenantId', 'paymentType'], {
    name: 'idx_payments_tenant_type',
  });
  await qi.addIndex('payments', ['tenantId', 'status'], {
    name: 'idx_payments_tenant_status',
  });
  await qi.addIndex('payments', ['tenantId', 'paymentNumber'], {
    unique: true,
    name: 'idx_payments_tenant_number_unique',
    where: { deletedAt: null },
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('payments');
}
