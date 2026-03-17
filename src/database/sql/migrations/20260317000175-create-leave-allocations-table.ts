import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('leave_allocations', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    leaveTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'leave_types', key: 'id' },
      onDelete: 'RESTRICT',
    },
    year: { type: DataTypes.INTEGER, allowNull: false },
    numberOfDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
    mode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'manual' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    approvedById: { type: DataTypes.UUID, allowNull: true },
    approvedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('leave_allocations', ['tenantId']);
  await qi.addIndex('leave_allocations', ['tenantId', 'employeeId']);
  await qi.addIndex('leave_allocations', ['tenantId', 'leaveTypeId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('leave_allocations');
}
