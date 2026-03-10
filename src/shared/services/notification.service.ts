import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import { MailService, MailJobData } from '@/infrastructure/mail/mail.service';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';
import { QUEUE_FCM, QUEUE_SMS } from '@/infrastructure/queues/queue.constants';

@Injectable()
export class SharedNotificationService {
  private readonly logger = new Logger(SharedNotificationService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    private readonly eventsGateway: EventsGateway,
    @InjectQueue(QUEUE_FCM) private readonly fcmQueue: Queue,
    @InjectQueue(QUEUE_SMS) private readonly smsQueue: Queue,
  ) {}

  async sendPush(
    tenantSlug: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await this.fcmQueue.add(
      'send',
      { tenantSlug, userId, title, body, data },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.debug(`FCM push queued for user ${userId}`);
  }

  async sendSms(phone: string, message: string): Promise<void> {
    await this.smsQueue.add(
      'send',
      { phone, message },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
    this.logger.debug(`SMS queued to ${phone}`);
  }

  async sendEmail(data: MailJobData): Promise<void> {
    await this.mailService.sendEmail(data);
  }

  async sendInApp(
    tenantSlug: string,
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    this.eventsGateway.emitToUser(tenantSlug, userId, event, payload);
    this.logger.debug(`In-app notification sent to user ${userId}`);
  }

  emitToRole(tenantSlug: string, roleName: string, event: string, data: unknown): void {
    this.eventsGateway.emitToRole(tenantSlug, roleName, event, data);
  }

  emitToTenant(tenantSlug: string, event: string, data: unknown): void {
    this.eventsGateway.emitToTenant(tenantSlug, event, data);
  }
}
