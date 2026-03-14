import { Injectable, Logger } from '@nestjs/common';
import { INotificationSender } from './notification-sender.interface';

@Injectable()
export class FcmSender implements INotificationSender {
  private readonly logger = new Logger(FcmSender.name);

  async send(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    this.logger.log(
      `[FCM MOCK] To: ${token}, Title: ${title}, Body: ${body}, Data: ${JSON.stringify(data ?? {})}`,
    );
  }
}
