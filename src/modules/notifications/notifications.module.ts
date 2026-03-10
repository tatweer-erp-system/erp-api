import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from '../../database/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '../../database/repositories/notification-preferences.repository';
import { NotificationTemplatesRepository } from '../../database/repositories/notification-templates.repository';
import { FcmProcessor } from './services/fcm.processor';
import { SmsProcessor } from './services/sms.processor';
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
