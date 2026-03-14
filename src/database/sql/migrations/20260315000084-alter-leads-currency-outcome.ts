import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leads', schema: 'public' };

  await qi.addColumn(table, 'currencyId', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: { tableName: 'currencies', schema: 'public' }, key: 'id' },
    onDelete: 'SET NULL',
  });

  await qi.addColumn(table, 'valueBase', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  });

  await qi.addColumn(table, 'lostReason', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await qi.addColumn(table, 'wonAt', {
    type: 'TIMESTAMPTZ' as any,
    allowNull: true,
  });

  await qi.addColumn(table, 'lostAt', {
    type: 'TIMESTAMPTZ' as any,
    allowNull: true,
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leads', schema: 'public' };

  await qi.removeColumn(table, 'lostAt');
  await qi.removeColumn(table, 'wonAt');
  await qi.removeColumn(table, 'lostReason');
  await qi.removeColumn(table, 'valueBase');
  await qi.removeColumn(table, 'currencyId');
}
