import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class TenantSequelizeService implements OnModuleDestroy {
  private readonly tenantConnections = new Map<string, Sequelize>();

  constructor(
    @InjectConnection() private readonly sharedSequelize: Sequelize,
    private readonly configService: ConfigService,
  ) {}

  getSharedSequelize(): Sequelize {
    return this.sharedSequelize;
  }

  async getSequelizeForTenant(slug: string): Promise<Sequelize> {
    if (this.tenantConnections.has(slug)) {
      return this.tenantConnections.get(slug)!;
    }

    const dbConfig = this.configService.get('database');
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      schema: `tenant_${slug}`,
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    });

    await sequelize.query(`SET search_path = "tenant_${slug}", public`);
    this.tenantConnections.set(slug, sequelize);
    return sequelize;
  }

  async setSearchPath(sequelize: Sequelize, slug: string): Promise<void> {
    await sequelize.query(`SET search_path = "tenant_${slug}", public`);
  }

  async createTenantSchema(slug: string): Promise<void> {
    await this.sharedSequelize.query(
      `CREATE SCHEMA IF NOT EXISTS "tenant_${slug}"`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    for (const [, conn] of this.tenantConnections) {
      await conn.close();
    }
    this.tenantConnections.clear();
  }
}
