import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('vouchers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'discount' },
    discount_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'percent' },
    discount_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    min_order_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    max_discount_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    max_uses: { type: DataTypes.INTEGER, allowNull: true },
    used_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    max_uses_per_customer: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    valid_from: { type: DataTypes.DATEONLY, allowNull: true },
    valid_until: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('vouchers', ['tenant_id']);
  await qi.addIndex('vouchers', ['code']);
  await qi.addIndex('vouchers', ['customer_id']);
  await qi.addIndex('vouchers', ['valid_until']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_code_tenant_unique" ON "vouchers" ("tenant_id", "code") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "vouchers_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('vouchers');
}
