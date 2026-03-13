import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('loyalty_tiers', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'loyalty_programs', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.STRING(50), allowNull: false },
    minPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    earnMultiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    redeemMultiplier: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 1.0 },
    color: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#CD7F32' },
    benefits: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('loyalty_tiers', ['programId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('loyalty_tiers');
}
