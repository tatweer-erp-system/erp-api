import { Module, Global, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const enabled = configService.get<boolean>('mongodb.enabled');
        const uri = configService.get<string>('mongodb.uri');

        if (!enabled) {
          Logger.warn('MongoDB is disabled – using in-memory fallback URI', 'MongodbModule');
          return { uri: 'mongodb://localhost:27017/erp_noop', lazyConnection: true };
        }

        return { uri };
      },
      inject: [ConfigService],
    }),
  ],
})
export class MongodbModule {}
