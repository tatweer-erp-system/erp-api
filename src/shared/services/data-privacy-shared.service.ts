import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
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

  async exportUserData(tenantSlug: string, userId: string): Promise<DataExportResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [users] = await sequelize.query(
      `SELECT id, email, first_name, last_name, phone, preferred_lang, is_active, created_at
       FROM users WHERE id = :userId`,
      { replacements: { userId } },
    );

    const [roles] = await sequelize.query(
      `SELECT r.name FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = :userId AND ur.deleted_at IS NULL`,
      { replacements: { userId } },
    );

    const [consents] = await sequelize.query(
      `SELECT consent_type, granted, granted_at, revoked_at
       FROM consent_records WHERE user_id = :userId ORDER BY created_at DESC`,
      { replacements: { userId } },
    );

    const [notifications] = await sequelize.query(
      `SELECT type, title, is_read, created_at FROM notifications
       WHERE user_id = :userId ORDER BY created_at DESC LIMIT 100`,
      { replacements: { userId } },
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenantSlug,
      profile: (users as any[])[0] ?? null,
      roles,
      consents,
      recentNotifications: notifications,
    };

    const buffer = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');
    const key = await this.storageService.upload(
      buffer,
      'application/json',
      `data-exports/${tenantSlug}`,
      `${userId}-${Date.now()}.json`,
    );
    const url = await this.storageService.getSignedUrl(key, 3600);

    return { url, expiresAt: new Date(Date.now() + 3600 * 1000) };
  }

  async anonymizeUser(tenantSlug: string, userId: string): Promise<AnonymizationResult> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const anonymizedId = uuidv4();

    await sequelize.query(
      `UPDATE users SET
        email = :email,
        phone = NULL,
        first_name = '{"en":"Deleted","ar":"محذوف"}'::jsonb,
        last_name = '{"en":"User","ar":"مستخدم"}'::jsonb,
        updated_at = NOW()
       WHERE id = :userId`,
      {
        replacements: {
          email: `deleted_${anonymizedId}@anonymized.invalid`,
          userId,
        },
      },
    );

    this.logger.log(`User ${userId} anonymized in tenant ${tenantSlug}`);

    return {
      userId,
      fieldsAnonymized: ['email', 'phone', 'first_name', 'last_name'],
      completedAt: new Date(),
    };
  }

  async recordConsent(tenantSlug: string, userId: string, consent: ConsentRecord): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `INSERT INTO consent_records (id, user_id, consent_type, granted, ip_address, user_agent, granted_at, created_at, updated_at)
       VALUES (:id, :userId, :consentType, :granted, :ip, :ua, NOW(), NOW(), NOW())`,
      {
        replacements: {
          id: uuidv4(),
          userId,
          consentType: consent.consentType,
          granted: consent.granted,
          ip: consent.ipAddress,
          ua: consent.userAgent,
        },
      },
    );
  }

  async revokeConsent(tenantSlug: string, userId: string, consentType: ConsentType): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE consent_records SET granted = false, revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = :userId AND consent_type = :consentType AND granted = true`,
      { replacements: { userId, consentType } },
    );
  }

  async getConsents(tenantSlug: string, userId: string): Promise<unknown[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [results] = await sequelize.query(
      `SELECT id, consent_type, granted, ip_address, user_agent, granted_at, revoked_at
       FROM consent_records WHERE user_id = :userId ORDER BY created_at DESC`,
      { replacements: { userId } },
    );
    return results as unknown[];
  }
}
