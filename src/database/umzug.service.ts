import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import * as path from 'path';

@Injectable()
export class UmzugService {
  private createUmzug(sequelize: Sequelize, migrationsPath: string, tableName: string): Umzug<Sequelize> {
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

  async runSharedMigrations(sequelize: Sequelize): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'shared');
    const umzug = this.createUmzug(sequelize, migrationsPath, 'shared_migrations');
    await umzug.up();
  }

  async runTenantMigrations(sequelize: Sequelize, slug: string): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'tenant');
    const tableName = `tenant_${slug}_migrations`;
    const umzug = this.createUmzug(sequelize, migrationsPath, tableName);
    await umzug.up();
  }
}
