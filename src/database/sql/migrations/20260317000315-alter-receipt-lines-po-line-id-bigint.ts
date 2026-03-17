import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'receipt_lines', schema: 'public' };

  // Change purchaseOrderLineId from UUID to BIGINT to match purchase_order_lines.id
  try {
    await qi.changeColumn(table, 'purchaseOrderLineId', {
      type: DataTypes.BIGINT,
      allowNull: true,
    });
  } catch (e) {
    // Column type may already be correct or column may not exist
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'receipt_lines', schema: 'public' };

  try {
    await qi.changeColumn(table, 'purchaseOrderLineId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    // ignore
  }
}
