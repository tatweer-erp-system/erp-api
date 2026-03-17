import { Module } from '@nestjs/common';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesDefinitionsController } from './controllers/sales-definitions.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SalesDefinitionsService } from './services/sales-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { DeliveriesService } from '@/modules/deliveries/services/deliveries.service';
import { PricelistsService } from '@/modules/pricelists/services/pricelists.service';
import { FiscalPositionsService } from '@/modules/fiscal-positions/services/fiscal-positions.service';
import { DownPaymentsService } from '@/modules/down-payments/services/down-payments.service';

@Module({
  controllers: [SalesOrdersController, SalesDefinitionsController],
  providers: [
    SalesOrdersService,
    SalesDefinitionsService,
    SequencesService,
    InvoicesService,
    DeliveriesService,
    PricelistsService,
    FiscalPositionsService,
    DownPaymentsService,
  ],
  exports: [SalesOrdersService],
})
export class SalesModule {}
