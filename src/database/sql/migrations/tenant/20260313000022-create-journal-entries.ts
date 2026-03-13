import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('journal_entries', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    entryNumber: { type: DataTypes.STRING(50), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'manual' },
    description: { type: DataTypes.TEXT, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    referenceType: { type: DataTypes.STRING(50), allowNull: true },
    reversedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    reversalOf: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    isPosted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    postedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    postedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    periodId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'fiscal_periods', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updatedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('journal_entries', ['tenantId']);
  await qi.addIndex('journal_entries', ['date']);
  await qi.addIndex('journal_entries', ['isPosted']);
  await qi.addIndex('journal_entries', ['referenceId']);
  await qi.addIndex('journal_entries', ['periodId']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_number_tenant_unique" ON "journal_entries" ("tenantId", "entryNumber") WHERE "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "journal_entries_number_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('journal_entries');
}
