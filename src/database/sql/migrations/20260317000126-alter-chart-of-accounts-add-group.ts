import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn('chart_of_accounts', 'groupId', {
    type: DataTypes.UUID,
    allowNull: true,
  });

  await qi.addIndex('chart_of_accounts', ['tenantId', 'groupId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.removeIndex('chart_of_accounts', ['tenantId', 'groupId']);
  await qi.removeColumn('chart_of_accounts', 'groupId');
}
