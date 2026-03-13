import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('tickets', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
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
    tenantName: { type: DataTypes.STRING(255), allowNull: true },
    createdByName: { type: DataTypes.STRING(255), allowNull: true },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    assignedToName: { type: DataTypes.STRING(255), allowNull: true },
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

  await qi.addIndex('tickets', ['tenantId']);
  await qi.addIndex('tickets', ['status']);
  await qi.addIndex('tickets', ['priority']);
  await qi.addIndex('tickets', ['assignedTo']);
  await qi.addIndex('tickets', ['createdAt']);

  // ticket_replies
  await qi.createTable('ticket_replies', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tickets', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: { type: DataTypes.UUID, allowNull: true },
    userName: { type: DataTypes.STRING(255), allowNull: true },
    senderType: {
      type: DataTypes.ENUM('agent', 'client'),
      allowNull: false,
      defaultValue: 'agent',
    },
    message: { type: DataTypes.TEXT, allowNull: false },
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

  await qi.addIndex('ticket_replies', ['tenantId']);
  await qi.addIndex('ticket_replies', ['ticketId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('ticket_replies');
  await qi.dropTable('tickets');
}
