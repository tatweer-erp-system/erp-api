import { Module } from '@nestjs/common';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesDefinitionsController } from './controllers/sales-definitions.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SalesDefinitionsService } from './services/sales-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [SalesOrdersController, SalesDefinitionsController],
  providers: [SalesOrdersService, SalesDefinitionsService, SequencesService],
  exports: [],
})
export class SalesModule {}
