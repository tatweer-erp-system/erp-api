import { Module } from '@nestjs/common';
import { AccountGroupsController } from './controllers/account-groups.controller';
import { TaxGroupsController } from './controllers/tax-groups.controller';
import { TaxesController } from './controllers/taxes.controller';
import { JournalsController } from './controllers/journals.controller';
import { PaymentTermsController } from './controllers/payment-terms.controller';
import { AccountGroupsService } from './services/account-groups.service';
import { TaxGroupsService } from './services/tax-groups.service';
import { TaxesService } from './services/taxes.service';
import { JournalsService } from './services/journals.service';
import { PaymentTermsService } from './services/payment-terms.service';

@Module({
  controllers: [
    AccountGroupsController,
    TaxGroupsController,
    TaxesController,
    JournalsController,
    PaymentTermsController,
  ],
  providers: [
    AccountGroupsService,
    TaxGroupsService,
    TaxesService,
    JournalsService,
    PaymentTermsService,
  ],
  exports: [],
})
export class AccountingSetupModule {}
