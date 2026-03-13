import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('shifts', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false },
    break_minutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 60 },
    is_overnight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    working_days: { type: DataTypes.JSONB, allowNull: true, defaultValue: [1, 2, 3, 4, 5] },
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

  await qi.addIndex('shifts', ['tenant_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('shifts');
}
