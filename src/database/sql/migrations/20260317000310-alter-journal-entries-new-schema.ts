import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'journal_entries', schema: 'public' };

  try {
    await qi.addColumn(table, 'journalId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'entry_type_new', {
      type: DataTypes.STRING(30),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'isReversed', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Index
  try {
    await qi.addIndex(table, ['tenantId', 'journalId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'journal_entries', schema: 'public' };

  await qi.removeColumn(table, 'journalId');
}
