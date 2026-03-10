import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_FCM, QUEUE_SMS } from '@/infrastructure/queues/queue.constants';

import { SharedNotificationService } from './services/notification.service';
import { SharedStorageService } from './services/storage.service';
import { SharedPdfService } from './services/pdf.service';
import { CurrencyService } from './services/currency.service';
import { TaxService } from './services/tax.service';
import { UserLookupService } from './services/user-lookup.service';
import { SharedAuditService } from './services/audit.service';
import { StatusTransitionService } from './services/status-transition.service';
import { DateService } from './services/date.service';
import { FinancialService } from './services/financial.service';
import { EncryptionService } from './services/encryption.service';
import { DataPrivacyService } from './services/data-privacy.service';
import { IdempotencyService } from './services/idempotency.service';
import { OutboxService } from './services/outbox.service';
import { FeatureFlagService } from './services/feature-flag.service';

const services = [
  SharedNotificationService,
  SharedStorageService,
  SharedPdfService,
  CurrencyService,
  TaxService,
  UserLookupService,
  SharedAuditService,
  StatusTransitionService,
  DateService,
  FinancialService,
  EncryptionService,
  DataPrivacyService,
  IdempotencyService,
  OutboxService,
  FeatureFlagService,
];

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_FCM }),
    BullModule.registerQueue({ name: QUEUE_SMS }),
  ],
  providers: services,
  exports: services,
})
export class SharedModule {}
