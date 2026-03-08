import { Module } from '@nestjs/common';
import { VendorsController } from './vendors/vendors.controller';
import { VendorsService } from './vendors/vendors.service';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';

@Module({
  controllers: [VendorsController, PurchaseOrdersController],
  providers: [VendorsService, PurchaseOrdersService],
  exports: [VendorsService, PurchaseOrdersService],
})
export class PurchasingModule {}
