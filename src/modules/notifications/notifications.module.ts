import { Module, DynamicModule, Logger } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { FcmProcessor } from './services/fcm.processor';
import { SmsProcessor } from './services/sms.processor';

@Module({})
export class NotificationsModule {
  private static readonly logger = new Logger(NotificationsModule.name);

  static forRoot(): DynamicModule {
    const queuesEnabled = process.env.QUEUES_ENABLED === 'true';

    const providers: any[] = [NotificationsService];

    if (queuesEnabled) {
      providers.push(FcmProcessor, SmsProcessor);
    } else {
      this.logger.warn('Queues disabled – FCM/SMS processors will not run');
    }

    return {
      module: NotificationsModule,
      global: true,
      controllers: [NotificationsController],
      providers,
      exports: [NotificationsService],
    };
  }
}
