import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS "pinHash" VARCHAR(255) NULL
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query(`ALTER TABLE public.users DROP COLUMN IF EXISTS "pinHash"`);
}
