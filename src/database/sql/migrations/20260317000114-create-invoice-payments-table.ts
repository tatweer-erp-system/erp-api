import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  const baseColumns = {
    id: { type: DataTypes.UUID, primaryKey: true },
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

  await qi.createTable('invoice_payments', {
    ...baseColumns,
    branchId: { type: DataTypes.UUID, allowNull: false },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'invoices', key: 'id' },
      onDelete: 'CASCADE',
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payments', key: 'id' },
      onDelete: 'CASCADE',
    },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
  });

  await qi.addIndex('invoice_payments', ['invoiceId'], {
    name: 'idx_invoice_payments_invoice',
  });
  await qi.addIndex('invoice_payments', ['paymentId'], {
    name: 'idx_invoice_payments_payment',
  });
  await qi.addIndex('invoice_payments', ['tenantId'], {
    name: 'idx_invoice_payments_tenant',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('invoice_payments');
}
