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

  await qi.createTable('invoice_lines', {
    ...baseColumns,
    branchId: { type: DataTypes.UUID, allowNull: false },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'invoices', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: { type: DataTypes.UUID, allowNull: true },
    productVariantId: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.STRING(500), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(18, 4), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(18, 4), allowNull: false },
    discountPct: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    priceSubtotal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    priceTax: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    priceTotal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    },
    accountId: { type: DataTypes.UUID, allowNull: true },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });

  await qi.addIndex('invoice_lines', ['invoiceId'], {
    name: 'idx_invoice_lines_invoice',
  });
  await qi.addIndex('invoice_lines', ['tenantId'], {
    name: 'idx_invoice_lines_tenant',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('invoice_lines');
}
