import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const [cols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'outbox_events' AND column_name = 'updatedAt'`,
  );

  if ((cols as any[]).length === 0) {
    await sequelize.query(
      `ALTER TABLE public.outbox_events ADD COLUMN "updatedAt" TIMESTAMPTZ NULL`,
    );
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const [cols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'outbox_events' AND column_name = 'updatedAt'`,
  );

  if ((cols as any[]).length > 0) {
    await sequelize.query(`ALTER TABLE public.outbox_events DROP COLUMN "updatedAt"`);
  }
}
