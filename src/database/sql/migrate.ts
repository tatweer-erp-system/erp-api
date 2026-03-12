import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

dotenv.config();

function createSequelize(schema?: string): Sequelize {
  return new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'secret',
    database: process.env.DB_NAME ?? 'erp_core',
    schema,
    logging: false,
  });
}

function createUmzug(
  sequelize: Sequelize,
  migrationsPath: string,
  tableName: string,
): Umzug<Sequelize> {
  return new Umzug({
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
    storage: new SequelizeStorage({ sequelize, tableName }),
    logger: console,
  });
}

async function run() {
  // Usage:
  //   npm run migration:run                  → shared + tenant migrations in public schema (up)
  //   npm run migration:down                 → shared migrations (down)
  //   npm run migration:run up tenant <slug> → tenant migrations in tenant schema (up)
  //   npm run migration:down tenant <slug>   → tenant migrations in tenant schema (down)
  const command = process.argv[2] ?? 'up';
  const target = process.argv[3]; // 'tenant' or undefined
  const slug = process.argv[4]; // tenant slug

  const isTenant = target === 'tenant';

  if (isTenant && !slug) {
    console.error('Error: tenant slug required — e.g. npm run migration:run up tenant mycompany');
    process.exit(1);
  }

  if (isTenant) {
    // Tenant-specific schema migrations
    const schema = `tenant_${slug}`;
    const sequelize = createSequelize(schema);
    await sequelize.authenticate();
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    const migrations = path.join(__dirname, 'migrations', 'tenant');
    const tableName = `tenant_${slug}_migrations`;
    const umzug = createUmzug(sequelize, migrations, tableName);

    console.log(`Running tenant (${slug}) migrations — command: ${command}`);

    if (command === 'down') {
      await umzug.down();
    } else {
      await umzug.up();
    }
    await sequelize.close();
  } else {
    // Run both shared + tenant migrations in public schema
    const sequelize = createSequelize('public');
    await sequelize.authenticate();

    // 1. Shared migrations
    const sharedPath = path.join(__dirname, 'migrations', 'shared');
    const sharedUmzug = createUmzug(sequelize, sharedPath, 'shared_migrations');
    console.log(`Running shared migrations — command: ${command}`);
    if (command === 'down') {
      await sharedUmzug.down();
    } else {
      await sharedUmzug.up();
    }

    // 2. Tenant table migrations in public schema (single-schema mode)
    if (command !== 'down') {
      const tenantPath = path.join(__dirname, 'migrations', 'tenant');
      const tenantUmzug = createUmzug(sequelize, tenantPath, 'tenant_public_migrations');
      console.log('Running tenant table migrations in public schema...');
      await tenantUmzug.up();
    }

    await sequelize.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
