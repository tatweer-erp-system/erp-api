import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

/**
 * BUG-004 fix: Tenant provisioning fails because ON CONFLICT clauses
 * require unique indexes, but the existing indexes are either:
 * - Non-unique (permissions)
 * - Partial unique with WHERE "deletedAt" IS NULL (tenant_settings)
 *
 * PostgreSQL requires an exact match between the ON CONFLICT column list
 * and a unique constraint/index (without partial WHERE conditions unless
 * the ON CONFLICT also specifies the same condition).
 */
export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  // ── 1. permissions: make (tenantId, module, action) unique ────────────
  await sequelize.query(`DROP INDEX IF EXISTS permissions_tenant_id_module_action`);
  await sequelize.query(
    `CREATE UNIQUE INDEX permissions_tenant_id_module_action ON permissions ("tenantId", module, action)`,
  );

  // ── 2. tenant_settings: make (tenantId, key) unique (non-partial) ─────
  await sequelize.query(`DROP INDEX IF EXISTS tenant_settings_tenant_id_key`);
  await sequelize.query(
    `CREATE UNIQUE INDEX tenant_settings_tenant_id_key ON tenant_settings ("tenantId", key)`,
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  // Revert to original non-unique / partial-unique indexes
  await sequelize.query(`DROP INDEX IF EXISTS permissions_tenant_id_module_action`);
  await sequelize.query(
    `CREATE INDEX permissions_tenant_id_module_action ON permissions ("tenantId", module, action)`,
  );

  await sequelize.query(`DROP INDEX IF EXISTS tenant_settings_tenant_id_key`);
  await sequelize.query(
    `CREATE UNIQUE INDEX tenant_settings_tenant_id_key ON tenant_settings ("tenantId", key) WHERE ("deletedAt" IS NULL)`,
  );
}
