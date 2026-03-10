import { Module, DynamicModule, Logger } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from './queue.constants';

const noopQueue = {
  add: async () => ({}) as any,
  addBulk: async () => [],
  close: async () => {},
};

@Module({})
export class QueuesModule {
  private static readonly logger = new Logger(QueuesModule.name);

  static forRoot(): DynamicModule {
    const enabled = process.env.QUEUES_ENABLED === 'true';

    if (!enabled) {
      this.logger.warn('Queues disabled – BullMQ will not connect to Redis');
      return {
        module: QueuesModule,
        global: true,
        providers: QUEUES.map((name) => ({
          provide: getQueueToken(name),
          useValue: noopQueue,
        })),
        exports: QUEUES.map((name) => getQueueToken(name)),
      };
    }

    return {
      module: QueuesModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            redis: {
              host: configService.get<string>('redisQueue.host'),
              port: configService.get<number>('redisQueue.port'),
            },
          }),
          inject: [ConfigService],
        }),
        ...QUEUES.map((name) => BullModule.registerQueue({ name })),
      ],
      exports: [BullModule],
    };
  }
}
