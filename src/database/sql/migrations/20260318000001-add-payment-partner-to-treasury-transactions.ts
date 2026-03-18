import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'treasury_transactions', schema: 'public' };

  // ── 1. Add paymentId column ────────────────────────────────────────────
  try {
    await qi.addColumn(table, 'paymentId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // ── 2. Add partnerId column ────────────────────────────────────────────
  try {
    await qi.addColumn(table, 'partnerId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // ── 3. Add indexes for FK lookups ──────────────────────────────────────
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS treasury_transactions_payment_id ON treasury_transactions ("paymentId")`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS treasury_transactions_partner_id ON treasury_transactions ("partnerId")`,
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'treasury_transactions', schema: 'public' };

  await sequelize.query(`DROP INDEX IF EXISTS treasury_transactions_payment_id`);
  await sequelize.query(`DROP INDEX IF EXISTS treasury_transactions_partner_id`);

  await qi.removeColumn(table, 'paymentId');
  await qi.removeColumn(table, 'partnerId');
}
