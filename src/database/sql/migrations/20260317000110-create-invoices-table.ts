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

  await qi.createTable('invoices', {
    ...baseColumns,
    branchId: { type: DataTypes.UUID, allowNull: false },
    journalId: { type: DataTypes.UUID, allowNull: true },
    partnerId: { type: DataTypes.UUID, allowNull: false },
    invoiceType: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'not_paid' },
    invoiceNumber: { type: DataTypes.STRING(50), allowNull: true },
    invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    paymentTermId: { type: DataTypes.UUID, allowNull: true },
    saleOrderId: { type: DataTypes.UUID, allowNull: true },
    purchaseOrderId: { type: DataTypes.UUID, allowNull: true },
    journalEntryId: { type: DataTypes.UUID, allowNull: true },
    currencyId: { type: DataTypes.UUID, allowNull: true },
    exchangeRate: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 1,
    },
    amountUntaxed: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountTax: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountTotal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountResidual: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountTotalBase: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    reference: { type: DataTypes.STRING(255), allowNull: true },
    narration: { type: DataTypes.TEXT, allowNull: true },
    fiscalPositionId: { type: DataTypes.UUID, allowNull: true },
    zatcaUUID: { type: DataTypes.STRING(255), allowNull: true },
    zatcaHash: { type: DataTypes.TEXT, allowNull: true },
    zatcaQRCode: { type: DataTypes.TEXT, allowNull: true },
    zatcaStatus: { type: DataTypes.STRING(20), allowNull: true },
    zatcaInvoiceCounter: { type: DataTypes.INTEGER, allowNull: true },
  });

  await qi.addIndex('invoices', ['tenantId'], {
    name: 'idx_invoices_tenant',
  });
  await qi.addIndex('invoices', ['tenantId', 'branchId'], {
    name: 'idx_invoices_tenant_branch',
  });
  await qi.addIndex('invoices', ['tenantId', 'partnerId'], {
    name: 'idx_invoices_tenant_partner',
  });
  await qi.addIndex('invoices', ['tenantId', 'invoiceType'], {
    name: 'idx_invoices_tenant_type',
  });
  await qi.addIndex('invoices', ['tenantId', 'status'], {
    name: 'idx_invoices_tenant_status',
  });
  await qi.addIndex('invoices', ['tenantId', 'saleOrderId'], {
    name: 'idx_invoices_tenant_sale_order',
  });
  await qi.addIndex('invoices', ['tenantId', 'purchaseOrderId'], {
    name: 'idx_invoices_tenant_purchase_order',
  });
  await qi.addIndex('invoices', ['tenantId', 'invoiceNumber'], {
    unique: true,
    name: 'idx_invoices_tenant_number_unique',
    where: { deletedAt: null },
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('invoices');
}
