import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';

// Config
import {
  appConfig,
  databaseConfig,
  redisCacheConfig,
  redisQueueConfig,
  jwtConfig,
  firebaseConfig,
  storageConfig,
  mailConfig,
  smsConfig,
  mongodbConfig,
  encryptionConfig,
} from '@/config';

// Database
import { DatabaseModule } from '@/database/sql/database.module';
import { MongodbModule } from '@/database/mongo/mongodb.module';

// Infrastructure
import { AppCacheModule } from '@/infrastructure/cache/cache.module';
import { QueuesModule } from '@/infrastructure/queues/queues.module';
import { FirebaseModule } from '@/infrastructure/firebase/firebase.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { PdfModule } from '@/infrastructure/pdf/pdf.module';
import { AuditModule } from '@/infrastructure/audit/audit.module';
import { EventsModule } from '@/infrastructure/websockets/events.module';
import { TracingModule } from '@/infrastructure/tracing/tracing.module';
import { MetricsModule } from '@/infrastructure/metrics/metrics.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { ReleasesModule } from '@/infrastructure/releases/releases.module';

// Common & Shared
import { CommonModule } from '@/common/common.module';
import { SharedModule } from '@/shared/shared.module';

// Feature Modules
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { BranchesModule } from '@/modules/branches/branches.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { ProductsModule } from '@/modules/products/products.module';
import { PartnersModule } from '@/modules/partners/partners.module';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { SalesModule } from '@/modules/sales/sales.module';
import { PurchasingModule } from '@/modules/purchasing/purchasing.module';
import { HrModule } from '@/modules/hr/hr.module';
import { PayrollModule } from '@/modules/payroll/payroll.module';
import { CrmModule } from '@/modules/crm/crm.module';
import { SettingsModule } from '@/modules/settings/settings.module';
import { SequencesModule } from '@/modules/sequences/sequences.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CurrencyModule } from '@/modules/currency/currency.module';
import { ReportingModule } from '@/modules/reporting/reporting.module';

// SaaS Management (backoffice)
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { AdminsModule } from '@/modules/admins/admins.module';
import { SubscriptionsModule } from '@/modules/subscriptions/subscriptions.module';
import { TenantConfigModule } from '@/modules/tenant-config/tenant-config.module';

// POS
import { PosOrdersModule } from '@/modules/pos-orders/pos-orders.module';
import { PosSessionsModule } from '@/modules/pos-sessions/pos-sessions.module';
import { PosCashiersModule } from '@/modules/pos-cashiers/pos-cashiers.module';

// Loyalty & Vouchers
import { LoyaltyModule } from '@/modules/loyalty/loyalty.module';
import { VouchersGiftCardsModule } from '@/modules/vouchers-gift-cards/vouchers-gift-cards.module';

// Restaurant
import { RestaurantModule } from '@/modules/restaurant/restaurant.module';

// Treasury
import { TreasuryModule } from '@/modules/treasury/treasury.module';

// HR Extensions
import { HrExtensionsModule } from '@/modules/hr-extensions/hr-extensions.module';

// Projects & Tickets
import { ProjectsModule } from '@/modules/projects/projects.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';

// ZATCA
import { ZatcaModule } from '@/modules/zatca/zatca.module';

// Infrastructure
import { AuditLogQueryModule } from '@/modules/audit-logs/audit-logs.module';
import { ChatModule } from '@/modules/chat/chat.module';

// Health
import { HealthController } from '@/health/health.controller';

// Middleware
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisCacheConfig,
        redisQueueConfig,
        jwtConfig,
        firebaseConfig,
        storageConfig,
        mailConfig,
        smsConfig,
        mongodbConfig,
        encryptionConfig,
      ],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          const lang = req.headers['accept-language']?.startsWith('ar') ? 'ar' : 'en';
          cls.set('lang', lang);
          const branchId = req.headers['x-branch-id'] as string;
          if (branchId) cls.set('branchId', branchId);
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    JwtModule.register({ global: true }),
    TerminusModule,
    // Database
    DatabaseModule,
    MongodbModule,
    // Infrastructure
    AppCacheModule,
    QueuesModule,
    FirebaseModule,
    StorageModule,
    MailModule,
    PdfModule,
    AuditModule,
    EventsModule,
    TracingModule,
    MetricsModule,
    OutboxModule,
    ReleasesModule,
    // Common & Shared
    CommonModule,
    SharedModule,
    // Feature Modules
    AuthModule,
    UsersModule,
    BranchesModule,
    RolesModule,
    ProductsModule,
    PartnersModule,
    AccountingModule,
    InventoryModule,
    SalesModule,
    PurchasingModule,
    HrModule,
    PayrollModule,
    CrmModule,
    SettingsModule,
    SequencesModule,
    NotificationsModule,
    CurrencyModule,
    ReportingModule,
    // SaaS Management (backoffice)
    TenantsModule,
    AdminsModule,
    SubscriptionsModule,
    TenantConfigModule,
    // POS
    PosOrdersModule,
    PosSessionsModule,
    PosCashiersModule,
    // Loyalty & Vouchers
    LoyaltyModule,
    VouchersGiftCardsModule,
    // Restaurant
    RestaurantModule,
    // Treasury
    TreasuryModule,
    // HR Extensions
    HrExtensionsModule,
    // Projects & Tickets
    ProjectsModule,
    TicketsModule,
    // ZATCA
    ZatcaModule,
    // Audit Logs & Chat
    AuditLogQueryModule,
    ChatModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
