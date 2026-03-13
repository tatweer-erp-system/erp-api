import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_programs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    points_per_currency: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    currency_per_point: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0.05 },
    expiry_days: { type: DataTypes.INTEGER, allowNull: true },
    min_redeem_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    max_redeem_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50.0 },
    settings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
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

  await qi.addIndex('loyalty_programs', ['tenant_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_programs');
}
