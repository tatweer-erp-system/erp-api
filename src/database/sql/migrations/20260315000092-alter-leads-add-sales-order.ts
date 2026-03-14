import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDesc = await queryInterface.describeTable('leads');
  if (!tableDesc['linkedSalesOrderId']) {
    await queryInterface.addColumn('leads', 'linkedSalesOrderId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'sales_orders', key: 'id' },
      onDelete: 'SET NULL',
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('leads', 'linkedSalesOrderId');
}
