import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_programs', key: 'id' },
      onDelete: 'SET NULL',
    },
    current_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lifetime_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tier_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'loyalty_tiers', key: 'id' },
      onDelete: 'SET NULL',
    },
    enrolled_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    last_activity_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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
  });

  await qi.addIndex('loyalty_accounts', ['tenant_id']);
  await qi.addIndex('loyalty_accounts', ['customer_id']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_customer_program_unique" ON "loyalty_accounts" ("customer_id", "program_id")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "loyalty_accounts_customer_program_unique"');
  await sequelize.getQueryInterface().dropTable('loyalty_accounts');
}
