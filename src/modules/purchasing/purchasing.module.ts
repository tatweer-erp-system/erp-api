import { Module } from '@nestjs/common';
import { VendorsController } from './controllers/vendors.controller';
import { VendorsService } from './services/vendors.service';
import { VendorsRepository } from '../../database/repositories/vendors.repository';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchaseOrdersRepository } from '../../database/repositories/purchase-orders.repository';
import { PurchaseOrderLinesRepository } from '../../database/repositories/purchase-order-lines.repository';

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
