import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_programs', key: 'id' },
      onDelete: 'SET NULL',
    },
    currentPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lifetimePoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tierId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: 'loyalty_tiers', key: 'id' },
      onDelete: 'SET NULL',
    },
    enrolledAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    lastActivityAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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
  });

  await qi.addIndex('loyalty_accounts', ['tenantId']);
  await qi.addIndex('loyalty_accounts', ['customerId']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_accounts_customer_program_unique" ON "loyalty_accounts" ("customerId", "programId")',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "loyalty_accounts_customer_program_unique"');
  await sequelize.getQueryInterface().dropTable('loyalty_accounts');
}
