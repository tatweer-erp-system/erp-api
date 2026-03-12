import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('tickets', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    tenant_name: { type: DataTypes.STRING(255), allowNull: true },
    created_by_name: { type: DataTypes.STRING(255), allowNull: true },
    assigned_to: { type: DataTypes.UUID, allowNull: true },
    assigned_to_name: { type: DataTypes.STRING(255), allowNull: true },
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

  await qi.addIndex('tickets', ['tenant_id']);
  await qi.addIndex('tickets', ['status']);
  await qi.addIndex('tickets', ['priority']);
  await qi.addIndex('tickets', ['assigned_to']);
  await qi.addIndex('tickets', ['created_at']);

  // ticket_replies
  await qi.createTable('ticket_replies', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tickets', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: { type: DataTypes.UUID, allowNull: true },
    user_name: { type: DataTypes.STRING(255), allowNull: true },
    sender_type: {
      type: DataTypes.ENUM('agent', 'client'),
      allowNull: false,
      defaultValue: 'agent',
    },
    message: { type: DataTypes.TEXT, allowNull: false },
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

  await qi.addIndex('ticket_replies', ['tenant_id']);
  await qi.addIndex('ticket_replies', ['ticket_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('ticket_replies');
  await qi.dropTable('tickets');
}
