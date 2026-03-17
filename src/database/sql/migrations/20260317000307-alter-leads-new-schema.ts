import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leads', schema: 'public' };

  try {
    await qi.addColumn(table, 'stageId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

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
    await qi.addColumn(table, 'type', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'lead',
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'probability', {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'expectedRevenue', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'expectedRevenueBase', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'source', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'campaign', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'medium', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'tags', {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'isWon', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'isLost', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'saleOrderId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Indexes
  try {
    await qi.addIndex(table, ['tenantId', 'stageId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }

  try {
    await qi.addIndex(table, ['tenantId', 'partnerId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }

  try {
    await qi.addIndex(table, ['tenantId', 'type'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'leads', schema: 'public' };

  await qi.removeColumn(table, 'saleOrderId');
  await qi.removeColumn(table, 'isLost');
  await qi.removeColumn(table, 'isWon');
  await qi.removeColumn(table, 'tags');
  await qi.removeColumn(table, 'medium');
  await qi.removeColumn(table, 'campaign');
  await qi.removeColumn(table, 'source');
  await qi.removeColumn(table, 'expectedRevenueBase');
  await qi.removeColumn(table, 'expectedRevenue');
  await qi.removeColumn(table, 'probability');
  await qi.removeColumn(table, 'type');
  await qi.removeColumn(table, 'partnerId');
  await qi.removeColumn(table, 'stageId');
}
