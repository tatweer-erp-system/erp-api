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
import { ReceiptsService } from '@/modules/receipts/services/receipts.service';
import { InvoicesService } from '@/modules/invoices/services/invoices.service';
import { ReceiptsRepository } from '@/database/sql/repositories/receipts.repository';
import { ReceiptLinesRepository } from '@/database/sql/repositories/receipt-lines.repository';
import { InvoicesRepository } from '@/database/sql/repositories/invoices.repository';
import { InvoiceLinesRepository } from '@/database/sql/repositories/invoice-lines.repository';
import { InvoiceLineTaxesRepository } from '@/database/sql/repositories/invoice-line-taxes.repository';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { InvoicePaymentsRepository } from '@/database/sql/repositories/invoice-payments.repository';

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
    // Receipts
    ReceiptsService,
    ReceiptsRepository,
    ReceiptLinesRepository,
    // Invoices
    InvoicesService,
    InvoicesRepository,
    InvoiceLinesRepository,
    InvoiceLineTaxesRepository,
    PaymentsNewRepository,
    InvoicePaymentsRepository,
  ],
  exports: [PurchaseOrdersService],
})
export class PurchasingModule {}
