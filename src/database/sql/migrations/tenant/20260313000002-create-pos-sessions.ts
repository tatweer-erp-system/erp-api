import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    cashier_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    terminal_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_terminals', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    opening_float: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    closing_float: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    expected_float: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    float_difference: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    opened_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    closed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('pos_sessions', ['tenant_id']);
  await qi.addIndex('pos_sessions', ['cashier_id']);
  await qi.addIndex('pos_sessions', ['terminal_id']);
  await qi.addIndex('pos_sessions', ['status']);

  // One open session per cashier per tenant
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_sessions_one_open_per_cashier" ON "pos_sessions" ("tenant_id", "cashier_id") WHERE "status" = \'open\' AND "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_sessions_one_open_per_cashier"');
  await sequelize.getQueryInterface().dropTable('pos_sessions');
}
