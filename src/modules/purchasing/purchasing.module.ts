import { Module } from '@nestjs/common';
import { VendorsController } from './controllers/vendors.controller';
import { VendorsService } from './services/vendors.service';
import {
  PurchaseOrdersController,
  PurchasingReportsController,
} from './controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchasingDefinitionsController } from './controllers/purchasing-definitions.controller';
import { PurchasingDefinitionsService } from './services/purchasing-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [
    VendorsController,
    PurchaseOrdersController,
    PurchasingReportsController,
    PurchasingDefinitionsController,
  ],
  providers: [
    VendorsService,
    PurchaseOrdersService,
    PurchasingDefinitionsService,
    SequencesService,
  ],
  exports: [],
})
export class PurchasingModule {}
