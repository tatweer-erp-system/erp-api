import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_MAIL } from '../queues/queue.constants';

export interface MailJobData {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  tenantSlug?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(QUEUE_MAIL) private readonly mailQueue: Queue) {}

  async sendEmail(data: MailJobData): Promise<void> {
    await this.mailQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
    this.logger.debug(`Mail queued to: ${data.to}`);
  }

  async sendWelcome(to: string, name: string, tenantSlug: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Welcome to ERP',
      template: 'welcome',
      context: { name },
      tenantSlug,
    });
  }

  async sendInvoice(
    to: string,
    invoiceData: Record<string, unknown>,
    tenantSlug: string,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Invoice #${invoiceData['invoiceNumber']}`,
      template: 'invoice',
      context: invoiceData,
      tenantSlug,
    });
  }
}
