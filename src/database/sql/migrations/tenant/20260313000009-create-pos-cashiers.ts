import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('pos_cashiers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    pin_hash: { type: DataTypes.STRING(255), allowNull: false },
    display_name: { type: DataTypes.STRING(100), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    max_discount_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 10.0 },
    can_refund: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    can_void: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    can_open_drawer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    failed_pin_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    locked_until: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('pos_cashiers', ['tenant_id']);
  await qi.addIndex('pos_cashiers', ['user_id']);

  // One active cashier per user per tenant
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "pos_cashiers_user_active_unique" ON "pos_cashiers" ("tenant_id", "user_id") WHERE "is_active" = true AND "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "pos_cashiers_user_active_unique"');
  await sequelize.getQueryInterface().dropTable('pos_cashiers');
}
