import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
  SequelizeHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: SequelizeHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly configService: ConfigService,
    @InjectConnection() private readonly sequelize: Sequelize,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database
      () => this.db.pingCheck('database', { connection: this.sequelize }),

      // Redis Cache
      async (): Promise<HealthIndicatorResult> => {
        const enabled = this.configService.get<boolean>('redisCache.enabled');
        if (!enabled) {
          return { redisCache: { status: 'up', message: 'cache disabled' } };
        }

        const host = this.configService.get<string>('redisCache.host');
        const port = this.configService.get<number>('redisCache.port');
        let client: Redis | undefined;

        try {
          client = new Redis({
            host,
            port,
            connectTimeout: 3000,
            lazyConnect: true,
          });
          await client.connect();
          await client.ping();
          return { redisCache: { status: 'up' } };
        } catch (error) {
          return { redisCache: { status: 'down', message: (error as Error).message } };
        } finally {
          if (client) {
            try {
              await client.disconnect();
            } catch {}
          }
        }
      },

      // Redis Queue (BullMQ)
      async (): Promise<HealthIndicatorResult> => {
        const host = this.configService.get<string>('redisQueue.host');
        const port = this.configService.get<number>('redisQueue.port');
        let client: Redis | undefined;

        try {
          client = new Redis({
            host,
            port,
            connectTimeout: 3000,
            lazyConnect: true,
          });
          await client.connect();
          await client.ping();
          return { redisQueue: { status: 'up' } };
        } catch (error) {
          return { redisQueue: { status: 'down', message: (error as Error).message } };
        } finally {
          if (client) {
            try {
              await client.disconnect();
            } catch {}
          }
        }
      },

      // Firebase (config presence check, non-critical)
      async (): Promise<HealthIndicatorResult> => {
        try {
          const projectId = this.configService.get<string>('firebase.projectId');
          if (projectId) {
            return { firebase: { status: 'up' } };
          }
          return { firebase: { status: 'up', message: 'not configured' } };
        } catch (error) {
          return { firebase: { status: 'up', message: 'not configured' } };
        }
      },

      // S3 (config presence check, non-critical)
      async (): Promise<HealthIndicatorResult> => {
        try {
          const accessKeyId = this.configService.get<string>('storage.accessKeyId');
          if (accessKeyId) {
            return { s3: { status: 'up' } };
          }
          return { s3: { status: 'up', message: 'not configured' } };
        } catch (error) {
          return { s3: { status: 'up', message: 'not configured' } };
        }
      },

      // Disk
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),

      // Memory
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
