import { Module, Global, Logger, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class MongodbModule {
  private static readonly logger = new Logger(MongodbModule.name);

  static forRoot(): DynamicModule {
    const enabled = process.env.MONGODB_ENABLED === 'true';

    if (!enabled) {
      this.logger.warn('MongoDB is disabled – Mongoose will not be loaded');
      return {
        module: MongodbModule,
        global: true,
      };
    }

    return {
      module: MongodbModule,
      global: true,
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const uri = configService.get<string>('mongodb.uri');
            return { uri };
          },
          inject: [ConfigService],
        }),
      ],
    };
  }
}
