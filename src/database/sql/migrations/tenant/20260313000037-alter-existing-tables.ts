import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // 1. Add brandId to products
  await qi.addColumn('products', 'brandId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'product_brands', key: 'id' },
    onDelete: 'SET NULL',
  });
  await qi.addIndex('products', ['brandId']);

  // 2. Add tableId FK on pos_orders (Agent A's table) → restaurant_tables
  await sequelize.query(`
    ALTER TABLE "pos_orders"
    ADD CONSTRAINT "fk_pos_orders_table"
    FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id")
    ON DELETE SET NULL
  `);

  // 3. Add giftCardId FK on pos_payments (Agent A's table) → gift_cards (Agent B's table)
  await sequelize.query(`
    ALTER TABLE "pos_payments"
    ADD CONSTRAINT "fk_pos_payments_gift_card"
    FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id")
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
  await qi.removeIndex('products', ['brandId']);
  await qi.removeColumn('products', 'brandId');
}
