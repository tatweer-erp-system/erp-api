import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    cashierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    terminalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_terminals', key: 'id' },
      onDelete: 'SET NULL',
    },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    openingFloat: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    closingFloat: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    expectedFloat: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    floatDifference: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    openedAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    closedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('pos_sessions', ['tenantId']);
  await qi.addIndex('pos_sessions', ['cashierId']);
  await qi.addIndex('pos_sessions', ['terminalId']);
  await qi.addIndex('pos_sessions', ['status']);

  // One open session per cashier per tenant
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_sessions_one_open_per_cashier" ON "pos_sessions" ("tenantId", "cashierId") WHERE "status" = \'open\' AND "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_sessions_one_open_per_cashier"');
  await sequelize.getQueryInterface().dropTable('pos_sessions');
}
