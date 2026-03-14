import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize
    .getQueryInterface()
    .addColumn({ tableName: 'subscriptions', schema: 'public' }, 'deletedAt', {
      type: 'TIMESTAMPTZ' as any,
      allowNull: true,
    });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize
    .getQueryInterface()
    .removeColumn({ tableName: 'subscriptions', schema: 'public' }, 'deletedAt');
}
