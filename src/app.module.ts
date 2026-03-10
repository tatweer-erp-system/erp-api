import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { JwtModule } from '@nestjs/jwt';
import { I18nModule, AcceptLanguageResolver, QueryResolver } from 'nestjs-i18n';
import * as path from 'path';

// ─── Configuration ───────────────────────────────────────────────────────────
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
  paymentConfig,
  encryptionConfig,
  otelConfig,
  outboxConfig,
  webhookConfig,
  idempotencyConfig,
} from './config';

// ─── Database ────────────────────────────────────────────────────────────────
import { DatabaseModule } from './database/database.module';
import { MongodbModule } from './database/mongodb/mongodb.module';

// ─── Infrastructure ──────────────────────────────────────────────────────────
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { QueuesModule } from './infrastructure/queues/queues.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { PdfModule } from './infrastructure/pdf/pdf.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { EventsModule } from './infrastructure/websockets/events.module';
import { TracingModule } from './infrastructure/tracing/tracing.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';

// ─── Shared ──────────────────────────────────────────────────────────────────
import { SharedModule } from './shared/shared.module';

// ─── Common (middleware) ─────────────────────────────────────────────────────
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// ─── Feature Modules (Section 24 build order) ───────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { AdminsModule } from './modules/admins/admins.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { HrModule } from './modules/hr/hr.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CrmModule } from './modules/crm/crm.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

// ─── Health ──────────────────────────────────────────────────────────────────
import { HealthController } from './health/health.controller';

// ─── Optional Feature Modules (loaded only when their dependencies are enabled)
const optionalModules = [];
if (process.env.FIREBASE_ENABLED === 'true') {
  optionalModules.push(ChatModule);
}

@Module({
  imports: [
    // ── Core Configuration ──────────────────────────────────────────────────
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
        paymentConfig,
        encryptionConfig,
        otelConfig,
        outboxConfig,
        webhookConfig,
        idempotencyConfig,
      ],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'development'}`],
    }),

    // ── Rate Limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
      }),
    }),

    // ── Internationalization ────────────────────────────────────────────────
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.get<string>('app.defaultLang') ?? 'en',
        loaderOptions: {
          path: path.join(__dirname, '/i18n/'),
          watch: true,
        },
      }),
      resolvers: [{ use: QueryResolver, options: ['lang'] }, AcceptLanguageResolver],
      inject: [ConfigService],
    }),

    // ── JWT (global for guards & strategies) ────────────────────────────────
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),

    // ── Health Checks ───────────────────────────────────────────────────────
    TerminusModule,

    // ── Database ────────────────────────────────────────────────────────────
    DatabaseModule,
    MongodbModule.forRoot(),

    // ── Infrastructure (all self-guard via enabled flags) ────────────────────
    AppCacheModule,
    QueuesModule.forRoot(),
    FirebaseModule,
    StorageModule,
    MailModule.forRoot(),
    PdfModule,
    AuditModule,
    EventsModule,
    TracingModule,
    MetricsModule,

    // ── Shared (@Global — available to all feature modules) ─────────────────
    SharedModule,

    // ── Feature Modules (ordered per Section 24 build order) ────────────────
    AuthModule,
    AdminsModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    NotificationsModule.forRoot(),
    ...optionalModules,
    HrModule,
    InventoryModule,
    CrmModule,
    PurchasingModule,
    ProjectsModule,
    ReportingModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global throttler guard — applies rate limiting to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware, TenantResolverMiddleware).forRoutes('*');
  }
}
