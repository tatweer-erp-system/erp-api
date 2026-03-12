import { Module } from '@nestjs/common';
import { VendorsController } from './controllers/vendors.controller';
import { VendorsService } from './services/vendors.service';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [VendorsController, PurchaseOrdersController],
  providers: [VendorsService, PurchaseOrdersService, SequencesService],
  exports: [VendorsService, PurchaseOrdersService],
})
export class PurchasingModule {}
