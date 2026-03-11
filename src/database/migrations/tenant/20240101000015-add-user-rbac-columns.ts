import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.addColumn('users', 'role', {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'employee',
  });

  await qi.addColumn('users', 'extra_permissions', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  });

  await qi.addColumn('users', 'revoked_permissions', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  });

  await qi.addIndex('users', ['role']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('users', 'role');
  await qi.removeColumn('users', 'extra_permissions');
  await qi.removeColumn('users', 'revoked_permissions');
}
