import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('training_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'employees', key: 'id' },
      onDelete: 'SET NULL',
    },
    course_name: { type: DataTypes.STRING(200), allowNull: false },
    provider: { type: DataTypes.STRING(200), allowNull: true },
    training_type: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'internal' },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    duration_hours: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planned' },
    score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    passed: { type: DataTypes.BOOLEAN, allowNull: true },
    certificate_number: { type: DataTypes.STRING(100), allowNull: true },
    certificate_url: { type: DataTypes.STRING(500), allowNull: true },
    certificate_expiry: { type: DataTypes.DATEONLY, allowNull: true },
    cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
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

  await qi.addIndex('training_records', ['tenant_id']);
  await qi.addIndex('training_records', ['employee_id']);
  await qi.addIndex('training_records', ['status']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('training_records');
}
