import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

dotenv.config();

function createSequelize(): Sequelize {
  return new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'secret',
    database: process.env.DB_NAME ?? 'erp_core',
    schema: 'public',
    logging: false,
  });
}

function createUmzug(sequelize: Sequelize): Umzug<Sequelize> {
  return new Umzug({
    migrations: {
      glob: path.join(__dirname, 'migrations', '*.ts'),
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
}

async function run() {
  const command = process.argv[2] ?? 'up';

  const sequelize = createSequelize();
  await sequelize.authenticate();

  const umzug = createUmzug(sequelize);
  console.log(`Running migrations — command: ${command}`);

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
