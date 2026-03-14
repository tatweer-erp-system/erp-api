import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const tableDesc = await qi.describeTable('leads');
  if (!tableDesc['linkedSalesOrderId']) {
    await qi.addColumn('leads', 'linkedSalesOrderId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'sales_orders', key: 'id' },
      onDelete: 'SET NULL',
    });
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('leads', 'linkedSalesOrderId');
}
