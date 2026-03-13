import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── consent_records ────────────────────────────────────────────────────────
  await qi.createTable('consent_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    consentType: { type: DataTypes.STRING(50), allowNull: false },
    granted: { type: DataTypes.BOOLEAN, allowNull: false },
    ipAddress: { type: DataTypes.STRING(50), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    grantedAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    revokedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('consent_records', ['tenantId']);
  await qi.addIndex('consent_records', ['userId']);
  await qi.addIndex('consent_records', ['userId', 'consentType']);

  // ── erasure_requests ───────────────────────────────────────────────────────
  await qi.createTable('erasure_requests', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    requestedAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    processedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    processedBy: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('erasure_requests', ['tenantId']);
  await qi.addIndex('erasure_requests', ['userId']);
  await qi.addIndex('erasure_requests', ['status']);

  // ── retention_logs ─────────────────────────────────────────────────────────
  await qi.createTable('retention_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    dataType: { type: DataTypes.STRING(50), allowNull: false },
    recordsPurged: { type: DataTypes.INTEGER, allowNull: false },
    purgedAt: { type: 'TIMESTAMPTZ' as any, allowNull: false },
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

  await qi.addIndex('retention_logs', ['tenantId']);
  await qi.addIndex('retention_logs', ['purgedAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('retention_logs');
  await qi.dropTable('erasure_requests');
  await qi.dropTable('consent_records');
}
