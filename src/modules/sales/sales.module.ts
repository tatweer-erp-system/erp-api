import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  imports: [InventoryModule, AccountingModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, SequencesService],
  exports: [],
})
export class SalesModule {}
