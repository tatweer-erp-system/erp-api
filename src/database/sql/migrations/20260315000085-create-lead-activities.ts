import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'lead_activities', schema: 'public' },
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      leadId: { type: DataTypes.UUID, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: false },
      activityType: { type: DataTypes.STRING(50), allowNull: false },
      fromStatus: { type: DataTypes.STRING(50), allowNull: true },
      toStatus: { type: DataTypes.STRING(50), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
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
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
  );

  await qi.addIndex({ tableName: 'lead_activities', schema: 'public' }, ['tenantId']);
  await qi.addIndex({ tableName: 'lead_activities', schema: 'public' }, ['leadId']);
  await qi.addIndex({ tableName: 'lead_activities', schema: 'public' }, ['tenantId', 'leadId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable({ tableName: 'lead_activities', schema: 'public' });
}
