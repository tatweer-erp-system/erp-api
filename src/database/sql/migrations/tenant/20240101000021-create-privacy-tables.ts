import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── consent_records ────────────────────────────────────────────────────────
  await qi.createTable('consent_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    consent_type: { type: DataTypes.STRING(50), allowNull: false },
    granted: { type: DataTypes.BOOLEAN, allowNull: false },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    granted_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    revoked_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('consent_records', ['tenant_id']);
  await qi.addIndex('consent_records', ['user_id']);
  await qi.addIndex('consent_records', ['user_id', 'consent_type']);

  // ── erasure_requests ───────────────────────────────────────────────────────
  await qi.createTable('erasure_requests', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    requested_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    processed_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    processed_by: { type: DataTypes.UUID, allowNull: true },
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

  await qi.addIndex('erasure_requests', ['tenant_id']);
  await qi.addIndex('erasure_requests', ['user_id']);
  await qi.addIndex('erasure_requests', ['status']);

  // ── retention_logs ─────────────────────────────────────────────────────────
  await qi.createTable('retention_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    data_type: { type: DataTypes.STRING(50), allowNull: false },
    records_purged: { type: DataTypes.INTEGER, allowNull: false },
    purged_at: { type: 'TIMESTAMPTZ' as any, allowNull: false },
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

  await qi.addIndex('retention_logs', ['tenant_id']);
  await qi.addIndex('retention_logs', ['purged_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('retention_logs');
  await qi.dropTable('erasure_requests');
  await qi.dropTable('consent_records');
}
