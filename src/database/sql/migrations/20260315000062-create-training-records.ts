import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('training_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    courseName: { type: DataTypes.STRING(200), allowNull: false },
    provider: { type: DataTypes.STRING(200), allowNull: true },
    trainingType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'internal' },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    durationHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planned' },
    score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    passed: { type: DataTypes.BOOLEAN, allowNull: true },
    certificateNumber: { type: DataTypes.STRING(100), allowNull: true },
    certificateUrl: { type: DataTypes.STRING(500), allowNull: true },
    certificateExpiry: { type: DataTypes.DATEONLY, allowNull: true },
    cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
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

  await qi.addIndex('training_records', ['tenantId']);
  await qi.addIndex('training_records', ['employeeId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('training_records');
}
