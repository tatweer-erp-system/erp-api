import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('vouchers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'discount' },
    discountType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'percent' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    minOrderAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    maxDiscountAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    maxUses: { type: DataTypes.INTEGER, allowNull: true },
    usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxUsesPerCustomer: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    validFrom: { type: DataTypes.DATEONLY, allowNull: true },
    validUntil: { type: DataTypes.DATEONLY, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('vouchers', ['tenantId']);
  await qi.addIndex('vouchers', ['code']);
  await qi.addIndex('vouchers', ['customerId']);
  await qi.addIndex('vouchers', ['validUntil']);
  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "vouchers_code_tenant_unique" ON "vouchers" ("tenantId", "code") WHERE "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "vouchers_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('vouchers');
}
