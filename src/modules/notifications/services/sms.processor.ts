import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import Twilio from 'twilio';
import { QUEUE_SMS } from '@/infrastructure/queues/queue.constants';
import { SmsJobData } from '../interfaces/notification.interface';

@Processor(QUEUE_SMS)
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);
  private readonly twilioClient: ReturnType<typeof Twilio>;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') ?? '';
    this.twilioClient = Twilio(accountSid, authToken);
  }

  @Process('send')
  async handleSend(job: Job<SmsJobData>): Promise<void> {
    const { to, message } = job.data;
    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err) {
      this.logger.error(`SMS failed to ${to}`, err);
      throw err;
    }
  }
}
