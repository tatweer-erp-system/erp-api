import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'purchase_orders', schema: 'public' };

  // partnerId — alongside existing vendorId for backward compat
  try {
    await qi.addColumn(table, 'partnerId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'billStatus', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'nothing',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'receiptStatus', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'nothing',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'paymentTermId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'buyerId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Indexes
  try {
    await qi.addIndex(table, ['tenantId', 'partnerId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'purchase_orders', schema: 'public' };

  await qi.removeColumn(table, 'buyerId');
  await qi.removeColumn(table, 'paymentTermId');
  await qi.removeColumn(table, 'receiptStatus');
  await qi.removeColumn(table, 'billStatus');
  await qi.removeColumn(table, 'partnerId');
}
