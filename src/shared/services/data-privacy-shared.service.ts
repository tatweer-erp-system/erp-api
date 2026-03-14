import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';
import {
  DataExportResult,
  ConsentRecord,
  ConsentType,
  AnonymizationResult,
} from '../interfaces/data-privacy.interface';

@Injectable()
export class DataPrivacySharedService {
  private readonly logger = new Logger(DataPrivacySharedService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly storageService: StorageService,
  ) {}

  async exportUserData(tenantId: string, userId: string): Promise<DataExportResult> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const [users] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName", phone, "preferredLang", "isActive", "createdAt"
       FROM users WHERE id = :userId AND "tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );

    const [roles] = await sequelize.query(
      `SELECT r."nameEn" as name FROM roles r
       INNER JOIN user_roles ur ON ur."roleId" = r.id
       WHERE ur."userId" = :userId AND ur."tenantId" = :tenantId`,
      { replacements: { userId, tenantId } },
    );

    const [consents] = await sequelize.query(
      `SELECT "consentType", granted, "grantedAt", "revokedAt"
       FROM consent_records WHERE "userId" = :userId AND "tenantId" = :tenantId ORDER BY "createdAt" DESC`,
      { replacements: { userId, tenantId } },
    );

    const [notifications] = await sequelize.query(
      `SELECT type, title, "isRead", "createdAt" FROM notifications
       WHERE "userId" = :userId AND "tenantId" = :tenantId ORDER BY "createdAt" DESC LIMIT 100`,
      { replacements: { userId, tenantId } },
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenantId,
      profile: (users as unknown as any[])[0] ?? null,
      roles,
      consents,
      recentNotifications: notifications,
    };

    const buffer = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');
    const key = await this.storageService.upload(
      buffer,
      'application/json',
      `data-exports/${tenantId}`,
      `${userId}-${Date.now()}.json`,
    );
    const url = await this.storageService.getSignedUrl(key, 3600);

    return { url, expiresAt: new Date(Date.now() + 3600 * 1000) };
  }

  async anonymizeUser(tenantId: string, userId: string): Promise<AnonymizationResult> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const anonymizedId = uuidv4();

    await sequelize.query(
      `UPDATE users SET
        email = :email,
        phone = NULL,
        "firstName" = 'Deleted',
        "lastName" = 'User',
        "updatedAt" = NOW()
       WHERE id = :userId AND "tenantId" = :tenantId`,
      {
        replacements: {
          email: `deleted_${anonymizedId}@anonymized.invalid`,
          userId,
          tenantId,
        },
      },
    );

    this.logger.log(`User ${userId} anonymized in tenant ${tenantId}`);

    return {
      userId,
      fieldsAnonymized: ['email', 'phone', 'firstName', 'lastName'],
      completedAt: new Date(),
    };
  }

  async recordConsent(tenantId: string, userId: string, consent: ConsentRecord): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO consent_records (id, "tenantId", "userId", "consentType", granted, "ipAddress", "userAgent", "grantedAt", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :userId, :consentType, :granted, :ip, :ua, NOW(), NOW(), NOW())`,
      {
        replacements: {
          id: uuidv4(),
          tenantId,
          userId,
          consentType: consent.consentType,
          granted: consent.granted,
          ip: consent.ipAddress,
          ua: consent.userAgent,
        },
      },
    );
  }

  async revokeConsent(tenantId: string, userId: string, consentType: ConsentType): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE consent_records SET granted = false, "revokedAt" = NOW(), "updatedAt" = NOW()
       WHERE "userId" = :userId AND "tenantId" = :tenantId AND "consentType" = :consentType AND granted = true`,
      { replacements: { userId, tenantId, consentType } },
    );
  }

  async getConsents(tenantId: string, userId: string): Promise<unknown[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [results] = await sequelize.query(
      `SELECT id, "consentType", granted, "ipAddress", "userAgent", "grantedAt", "revokedAt"
       FROM consent_records WHERE "userId" = :userId AND "tenantId" = :tenantId ORDER BY "createdAt" DESC`,
      { replacements: { userId, tenantId } },
    );
    return results as unknown[];
  }
}
