import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('kitchen_tickets', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'pos_orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    course: { type: DataTypes.STRING(30), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    station: { type: DataTypes.STRING(50), allowNull: true },
    priority: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    sent_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    started_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    completed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('kitchen_tickets', ['tenant_id']);
  await qi.addIndex('kitchen_tickets', ['order_id']);
  await qi.addIndex('kitchen_tickets', ['status']);
  await qi.addIndex('kitchen_tickets', ['course']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('kitchen_tickets');
}
