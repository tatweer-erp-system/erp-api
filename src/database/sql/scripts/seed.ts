/**
 * Test seeder runner — drops all tables, re-runs all migrations, then runs test seeders.
 *
 * Usage: pnpm seed
 *
 * FORBIDDEN in production — aborts immediately if NODE_ENV=production.
 *
 * Flow:
 *  1. Drop all tables (full reset)
 *  2. Run all migrations from scratch (schema + seed-data)
 *  3. Run test seeders (additional test/demo data)
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

dotenv.config();

// ── Production guard ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  throw new Error('seed is forbidden in production');
}

/** Drop all tables in the public schema (full reset). */
async function resetDatabase(sequelize: Sequelize): Promise<void> {
  console.log('Resetting database...');

  // Drop all tables (CASCADE handles FK dependencies)
  await sequelize.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE 'sql_%'
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public."' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);

  // Also drop enum types to avoid conflicts on re-creation
  await sequelize.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT typname FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public."' || r.typname || '" CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('  Database reset complete — all tables and enums dropped');
}

/** Run all migrations from scratch. */
async function runMigrations(sequelize: Sequelize): Promise<void> {
  const migrationsPath = path.join(__dirname, '..', 'migrations');
  const umzug = new Umzug({
    migrations: {
      glob: path.join(migrationsPath, '*.ts'),
      resolve: ({ name, path: migPath, context }) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const migration = require(migPath!);
        return {
          name,
          up: async () => migration.up({ context }),
          down: async () => migration.down({ context }),
        };
      },
    },
    context: sequelize,
    storage: new SequelizeStorage({ sequelize, tableName: 'shared_migrations' }),
    logger: console,
  });

  await umzug.up();
}

async function run(): Promise<void> {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'secret',
    database: process.env.DB_NAME ?? 'erp_core',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Running full database reset + seed (dev/staging only)...\n');

    // 1. Drop everything
    await resetDatabase(sequelize);
    console.log('');

    // 2. Run all migrations from scratch
    console.log('Running all migrations...');
    await runMigrations(sequelize);
    console.log('');

    // 3. Run test seeders
    console.log('Running test seeders...');

    const { seed: seedPlans } = await import('../seeders/01-plans.seed');
    await seedPlans(sequelize);

    const { seed: seedDemoTenant } = await import('../seeders/02-demo-tenant.seed');
    await seedDemoTenant(sequelize);

    const { seed: seedUsersRoles } = await import('../seeders/03-users-roles.seed');
    await seedUsersRoles(sequelize);

    const { seed: seedBranchesDepts } = await import('../seeders/04-branches-departments.seed');
    await seedBranchesDepts(sequelize);

    const { seed: seedCurrenciesWarehouses } =
      await import('../seeders/05-currencies-warehouses.seed');
    await seedCurrenciesWarehouses(sequelize);

    const { seed: seedProducts } = await import('../seeders/06-products.seed');
    await seedProducts(sequelize);

    const { seed: seedCrm } = await import('../seeders/07-crm.seed');
    await seedCrm(sequelize);

    const { seed: seedHr } = await import('../seeders/08-hr.seed');
    await seedHr(sequelize);

    const { seed: seedPos } = await import('../seeders/09-pos.seed');
    await seedPos(sequelize);

    const { seed: seedAccounting } = await import('../seeders/10-accounting.seed');
    await seedAccounting(sequelize);

    const { seed: seedLoyalty } = await import('../seeders/11-loyalty.seed');
    await seedLoyalty(sequelize);

    const { seed: seedProjects } = await import('../seeders/12-projects.seed');
    await seedProjects(sequelize);

    const { seed: seedSequences } = await import('../seeders/13-sequences.seed');
    await seedSequences(sequelize);

    const { seed: seedNotifTemplates } = await import('../seeders/14-notification-templates.seed');
    await seedNotifTemplates(sequelize);

    const { seed: seedSystemLogs } = await import('../seeders/15-system-logs.seed');
    await seedSystemLogs(sequelize);

    const { seed: seedTickets } = await import('../seeders/16-tickets.seed');
    await seedTickets(sequelize);

    const { seed: seedReleases } = await import('../seeders/17-releases.seed');
    await seedReleases(sequelize);

    const { seed: seedDefinitions } = await import('../seeders/18-definitions.seed');
    await seedDefinitions(sequelize);

    const { seed: seedAccountingSetup } = await import('../seeders/19-accounting-setup.seed');
    await seedAccountingSetup(sequelize);

    const { seed: seedPartnersExtra } = await import('../seeders/20-partners-extra.seed');
    await seedPartnersExtra(sequelize);

    const { seed: seedEmailTemplates } = await import('../seeders/21-email-templates.seed');
    await seedEmailTemplates(sequelize);

    const { seed: seedActivities } = await import('../seeders/22-activities.seed');
    await seedActivities(sequelize);

    const { seed: seedSalesOrders } = await import('../seeders/23-sales-orders.seed');
    await seedSalesOrders(sequelize);

    const { seed: seedPurchaseOrders } = await import('../seeders/24-purchase-orders.seed');
    await seedPurchaseOrders(sequelize);

    console.log('\nFull reset + seed completed successfully.');
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
