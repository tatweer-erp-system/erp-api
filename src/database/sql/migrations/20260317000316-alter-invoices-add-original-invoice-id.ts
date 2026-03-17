import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'invoices', schema: 'public' };

  try {
    await qi.addColumn(table, 'originalInvoiceId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'invoices', schema: 'public' };

  await qi.removeColumn(table, 'originalInvoiceId');
}
