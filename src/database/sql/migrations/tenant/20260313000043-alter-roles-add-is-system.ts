import { QueryInterface, DataTypes } from 'sequelize';

export async function up(qi: QueryInterface): Promise<void> {
  await qi.addColumn('roles', 'isSystem', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  });
}

export async function down(qi: QueryInterface): Promise<void> {
  await qi.removeColumn('roles', 'isSystem');
}
