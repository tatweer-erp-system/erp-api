import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsController } from './controllers/vendors.controller';
import { VendorsService } from './services/vendors.service';
import {
  PurchaseOrdersController,
  PurchasingReportsController,
} from './controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { PurchasingDefinitionsController } from './controllers/purchasing-definitions.controller';
import { PurchasingDefinitionsService } from './services/purchasing-definitions.service';
import { PurchaseOrdersV2Controller } from './controllers/purchase-orders-v2.controller';
import { ReceiptsController } from './controllers/receipts.controller';
import { PurchasingService } from './services/purchasing.service';
import { PurchaseOrdersRepository } from '@/database/sql/repositories/purchase-orders.repository';
import { ReceiptsRepository } from '@/database/sql/repositories/receipts.repository';
import { PurchaseOrder } from '@/database/sql/entities/purchase-order.entity';
import { PurchaseOrderLine } from '@/database/sql/entities/purchase-order-line.entity';
import { Receipt } from '@/database/sql/entities/receipt.entity';
import { ReceiptLine } from '@/database/sql/entities/receipt-line.entity';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine, Receipt, ReceiptLine])],
  controllers: [
    VendorsController,
    PurchaseOrdersController,
    PurchasingReportsController,
    PurchasingDefinitionsController,
    PurchaseOrdersV2Controller,
    ReceiptsController,
  ],
  providers: [
    VendorsService,
    PurchaseOrdersService,
    PurchasingDefinitionsService,
    SequencesService,
    PurchaseOrdersRepository,
    ReceiptsRepository,
    PurchasingService,
  ],
  exports: [PurchasingService, PurchaseOrdersRepository, ReceiptsRepository],
})
export class PurchasingModule {}
