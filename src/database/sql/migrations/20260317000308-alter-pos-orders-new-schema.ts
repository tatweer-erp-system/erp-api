import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const ordersTable = { tableName: 'pos_orders', schema: 'public' };
  const itemsTable = { tableName: 'pos_order_items', schema: 'public' };

  // ── pos_orders: partnerId ────────────────────────────────────────────
  try {
    await qi.addColumn(ordersTable, 'partnerId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addIndex(ordersTable, ['tenantId', 'partnerId'], {
      where: { deletedAt: null },
    });
  } catch {
    /* index may already exist */
  }

  // ── pos_orders: invoiceId ────────────────────────────────────────────
  try {
    await qi.addColumn(ordersTable, 'invoiceId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  // ── pos_orders: fiscalPositionId ─────────────────────────────────────
  try {
    await qi.addColumn(ordersTable, 'fiscalPositionId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  // ── pos_order_items: productVariantId ────────────────────────────────
  try {
    await qi.addColumn(itemsTable, 'productVariantId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  // Back-fill partnerId from customerId where not yet set
  try {
    await sequelize.query(
      `UPDATE pos_orders SET "partnerId" = "customerId" WHERE "partnerId" IS NULL AND "customerId" IS NOT NULL`,
    );
  } catch {
    /* best-effort backfill */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const ordersTable = { tableName: 'pos_orders', schema: 'public' };
  const itemsTable = { tableName: 'pos_order_items', schema: 'public' };

  try {
    await qi.removeColumn(ordersTable, 'partnerId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn(ordersTable, 'invoiceId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn(ordersTable, 'fiscalPositionId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn(itemsTable, 'productVariantId');
  } catch {
    /* ignore */
  }
}
