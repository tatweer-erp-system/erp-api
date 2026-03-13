import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('cash_movements', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_sessions', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    reason: { type: DataTypes.STRING(100), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    cashier_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
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

  await qi.addIndex('cash_movements', ['tenant_id']);
  await qi.addIndex('cash_movements', ['session_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('cash_movements');
}
