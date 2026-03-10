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
  //   npm run migration:run              → shared migrations (up)
  //   npm run migration:down             → shared migrations (down)
  //   npm run migration:run tenant <slug> → tenant migrations (up)
  //   npm run migration:down tenant <slug>→ tenant migrations (down)
  const command = process.argv[2] ?? 'up';
  const target = process.argv[3]; // 'tenant' or undefined
  const slug = process.argv[4]; // tenant slug

  const isTenant = target === 'tenant';

  if (isTenant && !slug) {
    console.error('Error: tenant slug required — e.g. npm run migration:run tenant mycompany');
    process.exit(1);
  }

  const schema = isTenant ? `tenant_${slug}` : 'public';
  const sequelize = createSequelize(schema);
  const migrations = path.join(__dirname, 'migrations', isTenant ? 'tenant' : 'shared');
  const tableName = isTenant ? `tenant_${slug}_migrations` : 'shared_migrations';
  const umzug = createUmzug(sequelize, migrations, tableName);

  await sequelize.authenticate();

  if (isTenant) {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS tenant_${slug}`);
  }

  console.log(
    `Running ${isTenant ? `tenant (${slug})` : 'shared'} migrations — command: ${command}`,
  );

  if (command === 'down') {
    await umzug.down();
  } else {
    await umzug.up();
  }

  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
