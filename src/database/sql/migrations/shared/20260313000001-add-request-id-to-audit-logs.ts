import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`
    ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS "requestId" VARCHAR(255) NULL
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "audit_logs_requestId_idx"
    ON public.audit_logs ("requestId")
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`DROP INDEX IF EXISTS "audit_logs_requestId_idx"`);
  await sequelize.query(`ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS "requestId"`);
}
