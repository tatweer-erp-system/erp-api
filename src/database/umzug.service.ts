import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import * as path from 'path';

@Injectable()
export class UmzugService {
  private readonly logger = new Logger(UmzugService.name);

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
      logger: undefined,
    });
  }

  async runSharedMigrations(sequelize: Sequelize): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'shared');
    const umzug = this.createUmzug(sequelize, migrationsPath, 'shared_migrations');
    const pending = await umzug.pending();
    if (pending.length === 0) {
      this.logger.log('Shared migrations: already up to date');
      return;
    }
    this.logger.log(`Running ${pending.length} shared migration(s)...`);
    await umzug.up();
    this.logger.log('Shared migrations: complete');
  }

  async runTenantMigrations(sequelize: Sequelize, slug: string): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'tenant');
    const tableName = `tenant_${slug}_migrations`;
    const umzug = this.createUmzug(sequelize, migrationsPath, tableName);
    const pending = await umzug.pending();
    if (pending.length === 0) {
      this.logger.log(`Tenant [${slug}] migrations: already up to date`);
      return;
    }
    this.logger.log(`Running ${pending.length} migration(s) for tenant [${slug}]...`);
    await umzug.up();
    this.logger.log(`Tenant [${slug}] migrations: complete`);
  }

  async rollbackSharedMigration(sequelize: Sequelize): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'shared');
    const umzug = this.createUmzug(sequelize, migrationsPath, 'shared_migrations');
    await umzug.down();
    this.logger.log('Shared migration rolled back');
  }

  async rollbackTenantMigration(sequelize: Sequelize, slug: string): Promise<void> {
    const migrationsPath = path.join(__dirname, 'migrations', 'tenant');
    const tableName = `tenant_${slug}_migrations`;
    const umzug = this.createUmzug(sequelize, migrationsPath, tableName);
    await umzug.down();
    this.logger.log(`Tenant [${slug}] migration rolled back`);
  }
}
