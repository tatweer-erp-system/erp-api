import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'purchase_order_lines', schema: 'public' };

  try {
    await qi.addColumn(table, 'productVariantId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'qtyBilled', {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      defaultValue: 0,
    });
  } catch (e) {
    /* column may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'purchase_order_lines', schema: 'public' };

  await qi.removeColumn(table, 'qtyBilled');
  await qi.removeColumn(table, 'productVariantId');
}
