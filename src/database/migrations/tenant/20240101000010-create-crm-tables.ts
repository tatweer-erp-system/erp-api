import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── contacts ───────────────────────────────────────────────────────────────
  await qi.createTable('contacts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    company: { type: DataTypes.STRING(255), allowNull: true },
    position: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    assigned_to: { type: DataTypes.UUID, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('contacts', ['email']);
  await qi.addIndex('contacts', ['status']);
  await qi.addIndex('contacts', ['assigned_to']);
  await qi.addIndex('contacts', ['created_at']);

  // ── leads ──────────────────────────────────────────────────────────────────
  await qi.createTable('leads', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title: { type: DataTypes.STRING(255), allowNull: false },
    contact_id: {
      type: DataTypes.UUID, allowNull: true,
      references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL',
    },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'new' },
    priority: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'medium' },
    assigned_to: { type: DataTypes.UUID, allowNull: true },
    expected_close_date: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('leads', ['contact_id']);
  await qi.addIndex('leads', ['status']);
  await qi.addIndex('leads', ['assigned_to']);
  await qi.addIndex('leads', ['created_at']);

  // ── sales_orders (ZATCA Phase 2 compliant) ─────────────────────────────────
  await qi.createTable('sales_orders', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    order_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    contact_id: {
      type: DataTypes.UUID, allowNull: true,
      references: { model: 'contacts', key: 'id' }, onDelete: 'SET NULL',
    },
    subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },

    // ZATCA identifiers
    zatca_uuid: { type: DataTypes.UUID, allowNull: true },
    zatca_invoice_counter: { type: DataTypes.INTEGER, allowNull: true },
    zatca_hash: { type: DataTypes.TEXT, allowNull: true },
    zatca_qr_code: { type: DataTypes.TEXT, allowNull: true },
    zatca_signature: { type: DataTypes.TEXT, allowNull: true },
    zatca_submitted_at: { type: DataTypes.DATE, allowNull: true },
    zatca_cleared_at: { type: DataTypes.DATE, allowNull: true },
    zatca_status: { type: DataTypes.STRING(20), allowNull: true },

    // Invoice classification (ZATCA)
    invoice_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'standard' },
    transaction_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'invoice' },
    supply_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'goods' },

    // Tax fields (ZATCA)
    tax_category: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'S' },
    tax_exemption_code: { type: DataTypes.STRING(50), allowNull: true },
    tax_exemption_reason: { type: DataTypes.STRING(255), allowNull: true },

    // Credit/debit note reference
    original_invoice_id: { type: DataTypes.UUID, allowNull: true },

    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('sales_orders', ['order_number'], { unique: true });
  await qi.addIndex('sales_orders', ['contact_id']);
  await qi.addIndex('sales_orders', ['status']);
  await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "sales_orders_zatca_uuid_unique" ON "sales_orders" ("zatca_uuid") WHERE "zatca_uuid" IS NOT NULL');
  await qi.addIndex('sales_orders', ['zatca_status']);
  await qi.addIndex('sales_orders', ['invoice_type']);
  await qi.addIndex('sales_orders', ['transaction_type']);
  await qi.addIndex('sales_orders', ['original_invoice_id']);
  await qi.addIndex('sales_orders', ['created_at']);

  // ── sales_order_lines ──────────────────────────────────────────────────────
  await qi.createTable('sales_order_lines', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    order_id: {
      type: DataTypes.UUID, allowNull: false,
      references: { model: 'sales_orders', key: 'id' }, onDelete: 'CASCADE',
    },
    product_id: { type: DataTypes.UUID, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    discount_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 15 },
    tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    line_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('sales_order_lines', ['order_id']);
  await qi.addIndex('sales_order_lines', ['product_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('sales_order_lines');
  await qi.dropTable('sales_orders');
  await qi.dropTable('leads');
  await qi.dropTable('contacts');
}
