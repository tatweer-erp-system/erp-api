import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_tiers', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_programs', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.STRING(50), allowNull: false },
    min_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    earn_multiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    redeem_multiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#CD7F32' },
    benefits: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('loyalty_tiers', ['program_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_tiers');
}
