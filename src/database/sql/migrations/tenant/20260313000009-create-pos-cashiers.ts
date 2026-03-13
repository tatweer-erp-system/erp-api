import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_cashiers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    pinHash: { type: DataTypes.STRING(255), allowNull: false },
    displayName: { type: DataTypes.STRING(100), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    maxDiscountPct: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 10.0 },
    canRefund: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    canVoid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    canOpenDrawer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    failedPinAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('pos_cashiers', ['tenantId']);
  await qi.addIndex('pos_cashiers', ['userId']);

  // One active cashier per user per tenant
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_cashiers_user_active_unique" ON "pos_cashiers" ("tenantId", "userId") WHERE "isActive" = true AND "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_cashiers_user_active_unique"');
  await sequelize.getQueryInterface().dropTable('pos_cashiers');
}
