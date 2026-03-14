import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
      ON audit_logs ("tenantSlug", "createdAt" DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
      ON audit_logs ("tenantSlug", entity, "entityId");

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user
      ON audit_logs ("tenantSlug", "userId", "createdAt" DESC);
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`
    DROP INDEX IF EXISTS idx_audit_logs_tenant_created;
    DROP INDEX IF EXISTS idx_audit_logs_entity;
    DROP INDEX IF EXISTS idx_audit_logs_user;
  `);
}
