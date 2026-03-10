import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import { NotificationTemplatesRepository } from './notification-templates.repository';
import { FcmProcessor } from './fcm.processor';
import { SmsProcessor } from './sms.processor';
import { QUEUE_FCM, QUEUE_SMS, QUEUE_MAIL } from '../../infrastructure/queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_FCM }, { name: QUEUE_SMS }, { name: QUEUE_MAIL }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationPreferencesRepository,
    NotificationTemplatesRepository,
    FcmProcessor,
    SmsProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
