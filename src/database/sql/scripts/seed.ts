/**
 * Test seeder runner — flushes the DB, re-runs seed-data migrations, then runs test seeders.
 *
 * Usage: npm run seed:test
 *
 * FORBIDDEN in production — aborts immediately if NODE_ENV=production.
 *
 * Flow:
 *  1. Truncate all data tables (preserving structure)
 *  2. Clear seed-data migration tracking so they re-run
 *  3. Re-run all migrations (schema ones are no-ops, seed ones re-insert default data)
 *  4. Run test seeders (additional test/demo data only — no duplicates of system data)
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

dotenv.config();

// ── Production guard ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  throw new Error('seed:test is forbidden in production');
}

/** Truncate all tables in the public schema (preserving structure). */
async function flushDatabase(sequelize: Sequelize): Promise<void> {
  console.log('Flushing database...');

  // Get all user-created tables (exclude migration tracking)
  const [tables] = await sequelize.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
      AND tablename NOT IN ('shared_migrations', 'tenant_public_migrations')
  `);

  if ((tables as any[]).length === 0) {
    console.log('  No tables to flush');
    return;
  }

  const tableNames = (tables as any[]).map((t) => `"${t.tablename}"`).join(', ');
  await sequelize.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
  console.log(`  Flushed ${(tables as any[]).length} tables`);
}

/** Remove seed-data migration entries so Umzug re-runs them. */
async function clearSeedMigrationTracking(sequelize: Sequelize): Promise<void> {
  const [result] = await sequelize.query(
    `DELETE FROM shared_migrations WHERE name LIKE '%seed%' RETURNING name`,
  );
  const count = (result as any[]).length;
  if (count > 0) {
    console.log(`  Cleared ${count} seed-migration tracking entries`);
  }
}

/** Re-run migrations (schema = no-op, seed = re-insert default data). */
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
    console.log('Running test seeders (dev/staging only)...\n');

    // 1. Flush all data
    await flushDatabase(sequelize);

    // 2. Clear seed-migration tracking so they re-run
    await clearSeedMigrationTracking(sequelize);
    console.log('');

    // 3. Re-run migrations (seed-data ones will re-insert default data)
    console.log('Re-running seed-data migrations...');
    await runMigrations(sequelize);
    console.log('');

    // 4. Run test seeders (additional test/demo data only)
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

    console.log('\nAll test seeders completed successfully.');
  } finally {
    await sequelize.close();
  }
}

run().catch((err) => {
  console.error('Test seeder failed:', err);
  process.exit(1);
});
