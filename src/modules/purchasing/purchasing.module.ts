import { Module } from '@nestjs/common';
import { VendorsController } from './vendors/vendors.controller';
import { VendorsService } from './vendors/vendors.service';
import { VendorsRepository } from './vendors/vendors.repository';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { PurchaseOrdersRepository } from './purchase-orders/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from './purchase-orders/purchase-order-lines.repository';

@Module({
  controllers: [VendorsController, PurchaseOrdersController],
  providers: [
    VendorsService,
    VendorsRepository,
    PurchaseOrdersService,
    PurchaseOrdersRepository,
    PurchaseOrderLinesRepository,
  ],
  exports: [VendorsService, PurchaseOrdersService],
})
export class PurchasingModule {}
