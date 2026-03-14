import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── tenant_metrics (append-only, no updatedAt) ────────────────────────────
  await qi.createTable('tenant_metrics', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantSlug: { type: DataTypes.STRING(100), allowNull: false },
    metricDate: { type: DataTypes.DATEONLY, allowNull: false },
    activeUsers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    apiCallsTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    storageUsedMb: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    recordsTotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  await qi.addIndex('tenant_metrics', ['tenantSlug', 'metricDate'], { unique: true });
  await qi.addIndex('tenant_metrics', ['tenantSlug']);

  // ── tenant_onboarding ─────────────────────────────────────────────────────
  await qi.createTable('tenant_onboarding', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantSlug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    logoUploaded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    firstUserCreated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    firstEmployeeAdded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    firstProductAdded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    firstInvoiceCreated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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
  });

  await qi.addIndex('tenant_onboarding', ['tenantSlug'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('tenant_onboarding');
  await qi.dropTable('tenant_metrics');
}
