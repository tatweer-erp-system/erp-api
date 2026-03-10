import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Module({})
export class MailModule {
  private static readonly logger = new Logger(MailModule.name);

  static forRoot(): DynamicModule {
    const queuesEnabled = process.env.QUEUES_ENABLED === 'true';
    const mailEnabled = process.env.MAIL_ENABLED === 'true';

    const providers: any[] = [MailService];

    if (queuesEnabled && mailEnabled) {
      providers.push(MailProcessor);
    } else {
      this.logger.warn('Mail disabled – emails will be silently dropped');
    }

    return {
      module: MailModule,
      global: true,
      providers,
      exports: [MailService],
    };
  }
}
