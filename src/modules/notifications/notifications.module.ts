import { Module, DynamicModule, Logger } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from '../../database/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '../../database/repositories/notification-preferences.repository';
import { NotificationTemplatesRepository } from '../../database/repositories/notification-templates.repository';
import { FcmProcessor } from './services/fcm.processor';
import { SmsProcessor } from './services/sms.processor';

@Module({})
export class NotificationsModule {
  private static readonly logger = new Logger(NotificationsModule.name);

  static forRoot(): DynamicModule {
    const queuesEnabled = process.env.QUEUES_ENABLED === 'true';

    const providers: any[] = [
      NotificationsService,
      NotificationsRepository,
      NotificationPreferencesRepository,
      NotificationTemplatesRepository,
    ];

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
