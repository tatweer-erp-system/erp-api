import { Module } from '@nestjs/common';
import { DownPaymentsController } from './controllers/down-payments.controller';
import { DownPaymentsService } from './services/down-payments.service';

@Module({
  controllers: [DownPaymentsController],
  providers: [DownPaymentsService],
  exports: [],
})
export class DownPaymentsModule {}
