import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── outbox_events ──────────────────────────────────────────────────────────
  await qi.createTable('outbox_events', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    event_type: { type: DataTypes.STRING(50), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_error: { type: DataTypes.TEXT, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('outbox_events', ['status', 'created_at']);
  await qi.addIndex('outbox_events', ['tenant_slug']);

  // ── security_events ────────────────────────────────────────────────────────
  await qi.createTable('security_events', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    event_type: { type: DataTypes.STRING(50), allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: true },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    country: { type: DataTypes.STRING(100), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('security_events', ['event_type']);
  await qi.addIndex('security_events', ['user_id']);
  await qi.addIndex('security_events', ['tenant_slug']);
  await qi.addIndex('security_events', ['created_at']);

  // ── retention_logs ─────────────────────────────────────────────────────────
  await qi.createTable('retention_logs', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
    data_type: { type: DataTypes.STRING(50), allowNull: false },
    records_purged: { type: DataTypes.INTEGER, allowNull: false },
    purged_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('retention_logs', ['tenant_slug']);
  await qi.addIndex('retention_logs', ['purged_at']);

  // ── consent_records ────────────────────────────────────────────────────────
  await qi.createTable('consent_records', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    consent_type: { type: DataTypes.STRING(50), allowNull: false },
    granted: { type: DataTypes.BOOLEAN, allowNull: false },
    ip_address: { type: DataTypes.STRING(50), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    granted_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('consent_records', ['user_id']);
  await qi.addIndex('consent_records', ['user_id', 'consent_type']);

  // ── erasure_requests ───────────────────────────────────────────────────────
  await qi.createTable('erasure_requests', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: { type: DataTypes.UUID, allowNull: false },
    requested_at: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    processed_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await qi.addIndex('erasure_requests', ['user_id']);
  await qi.addIndex('erasure_requests', ['status']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('erasure_requests');
  await qi.dropTable('consent_records');
  await qi.dropTable('retention_logs');
  await qi.dropTable('security_events');
  await qi.dropTable('outbox_events');
}
