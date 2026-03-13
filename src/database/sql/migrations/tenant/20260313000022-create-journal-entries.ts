import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('journal_entries', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    entry_number: { type: DataTypes.STRING(50), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'manual' },
    description: { type: DataTypes.TEXT, allowNull: true },
    reference_id: { type: DataTypes.UUID, allowNull: true },
    reference_type: { type: DataTypes.STRING(50), allowNull: true },
    reversed_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    reversal_of: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'journal_entries', key: 'id' },
      onDelete: 'SET NULL',
    },
    is_posted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    posted_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    posted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    period_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'fiscal_periods', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('journal_entries', ['tenant_id']);
  await qi.addIndex('journal_entries', ['date']);
  await qi.addIndex('journal_entries', ['is_posted']);
  await qi.addIndex('journal_entries', ['reference_id']);
  await qi.addIndex('journal_entries', ['period_id']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_number_tenant_unique" ON "journal_entries" ("tenant_id", "entry_number") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "journal_entries_number_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('journal_entries');
}
