import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoyaltyAccount } from '@/database/sql/entities/loyalty-account.entity';
import { LoyaltyProgram } from '@/database/sql/entities/loyalty-program.entity';
import { LoyaltyTransaction } from '@/database/sql/entities/loyalty-transaction.entity';
import { LoyaltyTier } from '@/database/sql/entities/loyalty-tier.entity';
import { Voucher } from '@/database/sql/entities/voucher.entity';
import { VoucherRedemption } from '@/database/sql/entities/voucher-redemption.entity';
import { GiftCard } from '@/database/sql/entities/gift-card.entity';
import { GiftCardTransaction } from '@/database/sql/entities/gift-card-transaction.entity';

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
import { LoyaltySharedService } from './services/loyalty-shared.service';
import { VoucherGiftCardSharedService } from './services/voucher-gift-card-shared.service';
import { JournalPosterSharedService } from './services/journal-poster-shared.service';
import { SalesOrderSharedService } from './services/sales-order-shared.service';
import { InventorySharedService } from './services/inventory-shared.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';
import { TokenCacheSharedService } from './services/token-cache-shared.service';
import { PermissionCacheSharedService } from './services/permission-cache-shared.service';
import { ZatcaSharedService } from './services/zatca-shared.service';
import { ZatcaXmlSharedService } from './services/zatca-xml-shared.service';
import { ZatcaSigningSharedService } from './services/zatca-signing-shared.service';
import { ZatcaQrSharedService } from './services/zatca-qr-shared.service';
import { ZatcaPortalSharedService } from './services/zatca-portal-shared.service';
import { JwtSharedService } from './services/jwt-shared.service';

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
  LoyaltySharedService,
  VoucherGiftCardSharedService,
  JournalPosterSharedService,
  SalesOrderSharedService,
  InventorySharedService,
  SequencesService,
  TokenCacheSharedService,
  PermissionCacheSharedService,
  ZatcaSharedService,
  ZatcaXmlSharedService,
  ZatcaSigningSharedService,
  ZatcaQrSharedService,
  ZatcaPortalSharedService,
  JwtSharedService,
];

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      LoyaltyAccount,
      LoyaltyProgram,
      LoyaltyTransaction,
      LoyaltyTier,
      Voucher,
      VoucherRedemption,
      GiftCard,
      GiftCardTransaction,
    ]),
  ],
  providers: services,
  exports: [...services, TypeOrmModule],
})
export class SharedModule {}
