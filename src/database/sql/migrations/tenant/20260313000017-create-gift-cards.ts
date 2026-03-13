import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('gift_cards', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    initial_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    recipient_name: { type: DataTypes.STRING(100), allowNull: true },
    recipient_email: { type: DataTypes.STRING(200), allowNull: true },
    recipient_phone: { type: DataTypes.STRING(30), allowNull: true },
    issued_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    issued_order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    issued_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    expires_at: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('gift_cards', ['tenant_id']);
  await qi.addIndex('gift_cards', ['code']);
  await qi.addIndex('gift_cards', ['is_active']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "gift_cards_code_tenant_unique" ON "gift_cards" ("tenant_id", "code") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "gift_cards_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('gift_cards');
}
