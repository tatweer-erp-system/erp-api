import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── sales_orders (ZATCA Phase 2 compliant) ─────────────────────────────────
  await qi.createTable('sales_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },

    // ZATCA identifiers
    zatcaUuid: { type: DataTypes.UUID, allowNull: true },
    zatcaInvoiceCounter: { type: DataTypes.INTEGER, allowNull: true },
    zatcaHash: { type: DataTypes.TEXT, allowNull: true },
    zatcaQrCode: { type: DataTypes.TEXT, allowNull: true },
    zatcaSignature: { type: DataTypes.TEXT, allowNull: true },
    zatcaSubmittedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    zatcaClearedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    zatcaStatus: { type: DataTypes.STRING(20), allowNull: true },

    // Invoice classification (ZATCA)
    invoiceType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'standard' },
    transactionType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'invoice' },
    supplyType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'goods' },

    // Tax fields (ZATCA)
    taxCategory: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'S' },
    taxExemptionCode: { type: DataTypes.STRING(50), allowNull: true },
    taxExemptionReason: { type: DataTypes.STRING(255), allowNull: true },

    // Credit/debit note reference
    originalInvoiceId: { type: DataTypes.UUID, allowNull: true },

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

  await qi.addIndex('sales_orders', ['tenantId']);
  await qi.addIndex('sales_orders', ['branchId']);
  await qi.addIndex('sales_orders', ['orderNumber'], { unique: true });
  await qi.addIndex('sales_orders', ['contactId']);
  await qi.addIndex('sales_orders', ['status']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "sales_orders_zatca_uuid_unique" ON "sales_orders" ("zatcaUuid") WHERE "zatcaUuid" IS NOT NULL',
  );
  await qi.addIndex('sales_orders', ['zatcaStatus']);
  await qi.addIndex('sales_orders', ['invoiceType']);
  await qi.addIndex('sales_orders', ['transactionType']);
  await qi.addIndex('sales_orders', ['originalInvoiceId']);
  await qi.addIndex('sales_orders', ['createdAt']);

  // ── sales_order_lines ──────────────────────────────────────────────────────
  await qi.createTable('sales_order_lines', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'sales_orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discountAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    lineTotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
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

  await qi.addIndex('sales_order_lines', ['orderId']);
  await qi.addIndex('sales_order_lines', ['productId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('sales_order_lines');
  await qi.dropTable('sales_orders');
}
