import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_FCM, QUEUE_SMS } from '@/infrastructure/queues/queue.constants';

import { NotificationSharedService } from './services/notification.service';
import { StorageSharedService } from './services/storage.service';
import { PdfSharedService } from './services/pdf.service';
import { CurrencySharedService } from './services/currency.service';
import { TaxSharedService } from './services/tax.service';
import { UserLookupSharedService } from './services/user-lookup.service';
import { AuditSharedService } from './services/audit.service';
import { StatusTransitionSharedService } from './services/status-transition.service';
import { DateSharedService } from './services/date.service';
import { FinancialSharedService } from './services/financial.service';
import { EncryptionSharedService } from './services/encryption.service';
import { DataPrivacySharedService } from './services/data-privacy.service';
import { IdempotencySharedService } from './services/idempotency.service';
import { OutboxSharedService } from './services/outbox.service';
import { FeatureFlagSharedService } from './services/feature-flag.service';

const services = [
  NotificationSharedService,
  StorageSharedService,
  PdfSharedService,
  CurrencySharedService,
  TaxSharedService,
  UserLookupSharedService,
  AuditSharedService,
  StatusTransitionSharedService,
  DateSharedService,
  FinancialSharedService,
  EncryptionSharedService,
  DataPrivacySharedService,
  IdempotencySharedService,
  OutboxSharedService,
  FeatureFlagSharedService,
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
