import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class TenantSequelizeService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantSequelizeService.name);
  private readonly tenantConnections = new Map<string, Sequelize>();

  constructor(
    @InjectConnection() private readonly sharedSequelize: Sequelize,
    private readonly configService: ConfigService,
  ) {}

  getSharedSequelize(): Sequelize {
    return this.sharedSequelize;
  }

  async getSequelizeForTenant(slug: string): Promise<Sequelize> {
    const sanitized = slug.replace(/[^a-z0-9_-]/gi, '');
    if (sanitized !== slug) {
      throw new Error(`Invalid tenant slug: ${slug}`);
    }

    if (this.tenantConnections.has(slug)) {
      const conn = this.tenantConnections.get(slug)!;
      await this.setSearchPath(conn, slug);
      return conn;
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
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000, evict: 1000 },
    });

    await this.setSearchPath(sequelize, slug);
    this.tenantConnections.set(slug, sequelize);
    this.logger.debug(`Created tenant connection: tenant_${slug}`);
    return sequelize;
  }

  async setSearchPath(sequelize: Sequelize, slug: string): Promise<void> {
    await sequelize.query(`SET search_path = "tenant_${slug}", public`);
  }

  async createTenantSchema(slug: string): Promise<void> {
    const sanitized = slug.replace(/[^a-z0-9_-]/gi, '');
    if (sanitized !== slug) {
      throw new Error(`Invalid tenant slug: ${slug}`);
    }
    await this.sharedSequelize.query(
      `CREATE SCHEMA IF NOT EXISTS "tenant_${slug}"`,
    );
    this.logger.log(`Created schema: tenant_${slug}`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const [slug, conn] of this.tenantConnections) {
      await conn.close();
      this.logger.debug(`Closed tenant connection: tenant_${slug}`);
    }
    this.tenantConnections.clear();
  }
}
