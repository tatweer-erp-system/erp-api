import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('leads', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    contactId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'contacts', key: 'id' },
      onDelete: 'SET NULL',
    },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'new' },
    priority: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'medium' },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    expectedCloseDate: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('leads', ['tenantId']);
  await qi.addIndex('leads', ['contactId']);
  await qi.addIndex('leads', ['status']);
  await qi.addIndex('leads', ['assignedTo']);
  await qi.addIndex('leads', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('leads');
}
