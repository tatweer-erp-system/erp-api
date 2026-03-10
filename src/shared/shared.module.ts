import { Module, Global } from '@nestjs/common';

import { NotificationSharedService } from './services/notification-shared.service';
import { StorageSharedService } from './services/storage-shared.service';
import { PdfSharedService } from './services/pdf-shared.service';
import { CurrencySharedService } from './services/currency-shared.service';
import { TaxSharedService } from './services/tax-shared.service';
import { UserLookupSharedService } from './services/user-lookup-shared.service';
import { AuditSharedService } from './services/audit-shared.service';
import { StatusTransitionSharedService } from './services/status-transition-shared.service';
import { DateSharedService } from './services/date-shared.service';
import { FinancialSharedService } from './services/financial-shared.service';
import { EncryptionSharedService } from './services/encryption-shared.service';
import { DataPrivacySharedService } from './services/data-privacy-shared.service';
import { IdempotencySharedService } from './services/idempotency-shared.service';
import { OutboxSharedService } from './services/outbox-shared.service';
import { FeatureFlagSharedService } from './services/feature-flag-shared.service';

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
  providers: services,
  exports: services,
})
export class SharedModule {}
