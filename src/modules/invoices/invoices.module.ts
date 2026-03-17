import { Module } from '@nestjs/common';
import { InvoicesController } from './controllers/invoices.controller';
import { PaymentsController } from './controllers/payments.controller';
import { InvoicesService } from './services/invoices.service';
import { PaymentsService } from './services/payments.service';
import { InvoicesRepository } from '@/database/sql/repositories/invoices.repository';
import { InvoiceLinesRepository } from '@/database/sql/repositories/invoice-lines.repository';
import { InvoiceLineTaxesRepository } from '@/database/sql/repositories/invoice-line-taxes.repository';
import { PaymentsNewRepository } from '@/database/sql/repositories/payments-new.repository';
import { InvoicePaymentsRepository } from '@/database/sql/repositories/invoice-payments.repository';

@Module({
  controllers: [InvoicesController, PaymentsController],
  providers: [
    InvoicesService,
    PaymentsService,
    InvoicesRepository,
    InvoiceLinesRepository,
    InvoiceLineTaxesRepository,
    PaymentsNewRepository,
    InvoicePaymentsRepository,
  ],
  exports: [],
})
export class InvoicesModule {}
