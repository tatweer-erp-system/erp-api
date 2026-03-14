import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'pos_orders', schema: 'public' };

  await qi.addColumn(table, 'offlineId', {
    type: DataTypes.UUID,
    allowNull: true,
    unique: true,
  });

  await qi.addColumn(table, 'createdOfflineAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  // syncedAt column already exists on pos_orders — skip adding it
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'pos_orders', schema: 'public' };

  await qi.removeColumn(table, 'createdOfflineAt');
  await qi.removeColumn(table, 'offlineId');
}
