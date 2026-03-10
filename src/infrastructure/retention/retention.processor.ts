import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_RETENTION } from '@/infrastructure/queues/queue.constants';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import * as Sentry from '@sentry/node';

const DEFAULT_RETENTION: Record<string, number> = {
  auditLogs: 365,
  notifications: 90,
  softDeletedRecords: 90,
  securityEvents: 180,
  outboxProcessed: 30,
  chatMessages: 730,
};

const BATCH_SIZE = 500;

interface TenantRow {
  slug: string;
  settings: Record<string, unknown> | string | null;
}

interface PurgeResult {
  dataType: string;
  recordsPurged: number;
}

@Processor(QUEUE_RETENTION)
export class RetentionProcessor {
  private readonly logger = new Logger(RetentionProcessor.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  @Process('purge')
  async handlePurge(job: Job): Promise<void> {
    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT slug, settings FROM tenants WHERE status = 'active' ORDER BY slug ASC`,
    );

    let totalPurged = 0;

    for (const tenant of tenants as unknown as TenantRow[]) {
      try {
        const settings =
          typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings || {};

        const retentionOverrides = (settings.retention || {}) as Record<string, number>;
        const complianceMode = !!settings.complianceMode;

        const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenant.slug);
        const results: PurgeResult[] = [];

        // Purge notifications
        const notificationDays =
          retentionOverrides.notifications ?? DEFAULT_RETENTION.notifications;
        const notificationsPurged = await this.purgeBatch(
          sequelize,
          `DELETE FROM notifications
           WHERE created_at < NOW() - INTERVAL '${notificationDays} days'
             AND deleted_at IS NOT NULL
           LIMIT ${BATCH_SIZE}`,
        );
        results.push({ dataType: 'notifications', recordsPurged: notificationsPurged });

        // Purge processed outbox events
        const outboxDays = retentionOverrides.outboxProcessed ?? DEFAULT_RETENTION.outboxProcessed;
        const outboxPurged = await this.purgeBatch(
          sequelize,
          `DELETE FROM outbox_events
           WHERE status = 'processed'
             AND created_at < NOW() - INTERVAL '${outboxDays} days'
           LIMIT ${BATCH_SIZE}`,
        );
        results.push({ dataType: 'outbox_events', recordsPurged: outboxPurged });

        // Purge security events
        const securityDays = retentionOverrides.securityEvents ?? DEFAULT_RETENTION.securityEvents;
        const securityPurged = await this.purgeBatch(
          sequelize,
          `DELETE FROM security_events
           WHERE created_at < NOW() - INTERVAL '${securityDays} days'
           LIMIT ${BATCH_SIZE}`,
        );
        results.push({ dataType: 'security_events', recordsPurged: securityPurged });

        // Purge audit logs (skip if compliance mode)
        if (!complianceMode) {
          const auditDays = retentionOverrides.auditLogs ?? DEFAULT_RETENTION.auditLogs;
          const auditPurged = await this.purgeBatch(
            sequelize,
            `DELETE FROM audit_logs
             WHERE created_at < NOW() - INTERVAL '${auditDays} days'
             LIMIT ${BATCH_SIZE}`,
          );
          results.push({ dataType: 'audit_logs', recordsPurged: auditPurged });
        } else {
          this.logger.log(`Skipping audit_logs purge for tenant=${tenant.slug} (complianceMode)`);
        }

        // Log results to retention_logs table
        for (const result of results) {
          if (result.recordsPurged > 0) {
            await sequelize.query(
              `INSERT INTO retention_logs (tenant_slug, data_type, records_purged, purged_at, created_at)
               VALUES (:tenantSlug, :dataType, :recordsPurged, NOW(), NOW())`,
              {
                replacements: {
                  tenantSlug: tenant.slug,
                  dataType: result.dataType,
                  recordsPurged: result.recordsPurged,
                },
              },
            );
          }
          totalPurged += result.recordsPurged;
        }

        this.logger.log(
          `Retention purge for tenant=${tenant.slug}: ${results.map((r) => `${r.dataType}=${r.recordsPurged}`).join(', ')}`,
        );
      } catch (err) {
        this.logger.error(`Retention purge failed for tenant=${tenant.slug}`, err);
        Sentry.captureException(err, {
          tags: { tenantSlug: tenant.slug },
        });
      }
    }

    this.logger.log(
      `Retention purge completed: ${totalPurged} total records purged across ${(tenants as unknown as TenantRow[]).length} tenants`,
    );
  }

  private async purgeBatch(sequelize: any, query: string): Promise<number> {
    const [, metadata] = await sequelize.query(query);
    return (metadata as unknown as any)?.rowCount ?? 0;
  }
}
