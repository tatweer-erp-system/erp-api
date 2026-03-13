import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // IMMUTABLE audit trail — no deleted_at
  await qi.createTable('manager_overrides', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    action_type: { type: DataTypes.STRING(50), allowNull: false },
    requested_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    notes: { type: DataTypes.TEXT, allowNull: true },
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
  });

  await qi.addIndex('manager_overrides', ['tenant_id']);
  await qi.addIndex('manager_overrides', ['session_id']);
  await qi.addIndex('manager_overrides', ['order_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('manager_overrides');
}
