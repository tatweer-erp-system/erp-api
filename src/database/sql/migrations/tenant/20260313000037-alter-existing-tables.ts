import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // 1. Add brand_id to products
  await qi.addColumn('products', 'brand_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'product_brands', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addIndex('products', ['brand_id']);

  // 2. Add table_id FK on pos_orders (Agent A's table) → restaurant_tables
  await sequelize.query(`
    ALTER TABLE "pos_orders"
    ADD CONSTRAINT "fk_pos_orders_table"
    FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id")
    ON DELETE SET NULL
  `);

  // 3. Add gift_card_id FK on pos_payments (Agent A's table) → gift_cards (Agent B's table)
  await sequelize.query(`
    ALTER TABLE "pos_payments"
    ADD CONSTRAINT "fk_pos_payments_gift_card"
    FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id")
    ON DELETE SET NULL
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Drop FKs first
  await sequelize.query(
    'ALTER TABLE "pos_payments" DROP CONSTRAINT IF EXISTS "fk_pos_payments_gift_card"',
  );
  await sequelize.query('ALTER TABLE "pos_orders" DROP CONSTRAINT IF EXISTS "fk_pos_orders_table"');

  // Drop added columns
  await qi.removeIndex('products', ['brand_id']);
  await qi.removeColumn('products', 'brand_id');
}
