import { Module } from '@nestjs/common';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, SequencesService],
  exports: [],
})
export class SalesModule {}
