import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

/**
 * BUG-001 + BUG-002 + BUG-003 fix:
 *
 * - purchase_order_lines.id: bigint → uuid (matches BaseEntity convention)
 * - sales_order_lines.id: bigint → uuid (matches TenantAwareEntity convention)
 * - receipt_lines.purchaseOrderLineId: ensure uuid (matches new PO lines id)
 * - delivery_lines.saleOrderLineId: already uuid (matches new SO lines id)
 *
 * Also drops old sequences that are no longer needed.
 */
export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── 1. purchase_order_lines.id: bigint → uuid ────────────────────────────

  // 1a. Drop the default (serial sequence)
  await sequelize.query(`ALTER TABLE purchase_order_lines ALTER COLUMN id DROP DEFAULT`);

  // 1b. Change column type — cast existing bigint values to uuid using gen_random_uuid()
  //     Since there may be existing data, we need to:
  //     - Add a new uuid column, populate it, drop old, rename
  await sequelize.query(`ALTER TABLE purchase_order_lines ADD COLUMN id_new UUID`);

  await sequelize.query(
    `UPDATE purchase_order_lines SET id_new = gen_random_uuid() WHERE id_new IS NULL`,
  );

  // Update any receipt_lines that reference old bigint PO line IDs → set to NULL
  // (they'll be re-linked with UUID once PO receipt flow is fixed)
  await sequelize.query(
    `UPDATE receipt_lines SET "purchaseOrderLineId" = NULL WHERE "purchaseOrderLineId" IS NOT NULL`,
  );

  // Drop the PK constraint
  await sequelize.query(
    `ALTER TABLE purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_pkey`,
  );

  // Drop old id column and rename new
  await sequelize.query(`ALTER TABLE purchase_order_lines DROP COLUMN id`);
  await sequelize.query(`ALTER TABLE purchase_order_lines RENAME COLUMN id_new TO id`);
  await sequelize.query(`ALTER TABLE purchase_order_lines ALTER COLUMN id SET NOT NULL`);
  await sequelize.query(`ALTER TABLE purchase_order_lines ADD PRIMARY KEY (id)`);

  // Drop the old sequence if it exists
  await sequelize.query(`DROP SEQUENCE IF EXISTS purchase_order_lines_id_seq`);

  // ── 2. Ensure receipt_lines.purchaseOrderLineId is UUID ──────────────────
  // (migration 20260317000315 may have changed it to BIGINT — revert)
  const [[colInfo]] = (await sequelize.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_name = 'receipt_lines' AND column_name = 'purchaseOrderLineId'`,
  )) as any;

  if (colInfo && colInfo.data_type !== 'uuid') {
    await sequelize.query(
      `ALTER TABLE receipt_lines ALTER COLUMN "purchaseOrderLineId" TYPE UUID USING NULL`,
    );
  }

  // ── 3. sales_order_lines.id: bigint → uuid ──────────────────────────────

  // 3a. Drop the default (serial sequence)
  await sequelize.query(`ALTER TABLE sales_order_lines ALTER COLUMN id DROP DEFAULT`);

  // 3b. Add new uuid column
  await sequelize.query(`ALTER TABLE sales_order_lines ADD COLUMN id_new UUID`);
  await sequelize.query(
    `UPDATE sales_order_lines SET id_new = gen_random_uuid() WHERE id_new IS NULL`,
  );

  // Update delivery_lines references — set to NULL (will be re-linked)
  await sequelize.query(
    `UPDATE delivery_lines SET "saleOrderLineId" = NULL WHERE "saleOrderLineId" IS NOT NULL`,
  );

  // Drop PK, swap columns
  await sequelize.query(
    `ALTER TABLE sales_order_lines DROP CONSTRAINT IF EXISTS sales_order_lines_pkey`,
  );
  await sequelize.query(`ALTER TABLE sales_order_lines DROP COLUMN id`);
  await sequelize.query(`ALTER TABLE sales_order_lines RENAME COLUMN id_new TO id`);
  await sequelize.query(`ALTER TABLE sales_order_lines ALTER COLUMN id SET NOT NULL`);
  await sequelize.query(`ALTER TABLE sales_order_lines ADD PRIMARY KEY (id)`);

  // Drop the old sequence
  await sequelize.query(`DROP SEQUENCE IF EXISTS sales_order_lines_id_seq`);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  // Reverting UUID→bigint is destructive and rarely needed.
  // This is a one-way migration by design.
  console.warn(
    'Down migration for order-lines UUID conversion is a no-op. Manual intervention required to revert.',
  );
}
