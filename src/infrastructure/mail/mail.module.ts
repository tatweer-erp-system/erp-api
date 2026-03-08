import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { QUEUE_MAIL } from '../queues/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_MAIL })],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
