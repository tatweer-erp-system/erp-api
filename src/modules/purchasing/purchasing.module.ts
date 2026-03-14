import { Module } from '@nestjs/common';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { VendorsController } from './controllers/vendors.controller';
import { VendorsService } from './services/vendors.service';
import {
  PurchaseOrdersController,
  PurchasingReportsController,
} from './controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  imports: [InventoryModule, AccountingModule],
  controllers: [VendorsController, PurchaseOrdersController, PurchasingReportsController],
  providers: [VendorsService, PurchaseOrdersService, SequencesService],
  exports: [],
})
export class PurchasingModule {}
