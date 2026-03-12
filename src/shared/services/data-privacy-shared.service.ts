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
      `SELECT id, email, first_name, last_name, phone, preferred_lang, is_active, created_at
       FROM users WHERE id = :userId AND tenant_id = :tenantId`,
      { replacements: { userId, tenantId } },
    );

    const [roles] = await sequelize.query(
      `SELECT r.name FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND ur.tenant_id = :tenantId AND ur.deleted_at IS NULL`,
      { replacements: { userId, tenantId } },
    );

    const [consents] = await sequelize.query(
      `SELECT consent_type, granted, granted_at, revoked_at
       FROM consent_records WHERE user_id = :userId AND tenant_id = :tenantId ORDER BY created_at DESC`,
      { replacements: { userId, tenantId } },
    );

    const [notifications] = await sequelize.query(
      `SELECT type, title, is_read, created_at FROM notifications
       WHERE user_id = :userId AND tenant_id = :tenantId ORDER BY created_at DESC LIMIT 100`,
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
        first_name = '{"en":"Deleted","ar":"محذوف"}'::jsonb,
        last_name = '{"en":"User","ar":"مستخدم"}'::jsonb,
        updated_at = NOW()
       WHERE id = :userId AND tenant_id = :tenantId`,
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
      fieldsAnonymized: ['email', 'phone', 'first_name', 'last_name'],
      completedAt: new Date(),
    };
  }

  async recordConsent(tenantId: string, userId: string, consent: ConsentRecord): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `INSERT INTO consent_records (id, tenant_id, user_id, consent_type, granted, ip_address, user_agent, granted_at, created_at, updated_at)
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
      `UPDATE consent_records SET granted = false, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = :userId AND tenant_id = :tenantId AND consent_type = :consentType AND granted = true`,
      { replacements: { userId, tenantId, consentType } },
    );
  }

  async getConsents(tenantId: string, userId: string): Promise<unknown[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [results] = await sequelize.query(
      `SELECT id, consent_type, granted, ip_address, user_agent, granted_at, revoked_at
       FROM consent_records WHERE user_id = :userId AND tenant_id = :tenantId ORDER BY created_at DESC`,
      { replacements: { userId, tenantId } },
    );
    return results as unknown[];
  }
}
