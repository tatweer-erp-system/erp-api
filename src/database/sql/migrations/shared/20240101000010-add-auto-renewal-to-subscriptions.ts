import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn('subscriptions', 'autoRenewal', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('subscriptions', 'autoRenewal');
}
