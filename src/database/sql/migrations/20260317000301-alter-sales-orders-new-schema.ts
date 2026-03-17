import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'sales_orders', schema: 'public' };

  // partnerId — alongside existing contactId for backward compat
  try {
    await qi.addColumn(table, 'partnerId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'invoiceStatus', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'nothing',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'deliveryStatus', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'pricelistId', {
      type: DataTypes.UUID,
      allowNull: true,
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
    await qi.addColumn(table, 'salespersonId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'fiscalPositionId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'internalNotes', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'confirmedAt', {
      type: 'TIMESTAMPTZ' as any,
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

  try {
    await qi.addIndex(table, ['tenantId', 'invoiceStatus'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'sales_orders', schema: 'public' };

  await qi.removeColumn(table, 'confirmedAt');
  await qi.removeColumn(table, 'internalNotes');
  await qi.removeColumn(table, 'fiscalPositionId');
  await qi.removeColumn(table, 'salespersonId');
  await qi.removeColumn(table, 'paymentTermId');
  await qi.removeColumn(table, 'pricelistId');
  await qi.removeColumn(table, 'deliveryStatus');
  await qi.removeColumn(table, 'invoiceStatus');
  await qi.removeColumn(table, 'partnerId');
}
