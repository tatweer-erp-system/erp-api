import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';

export interface CreateOutboxEventDto {
  tenantSlug: string;
  eventType: string;
  payload: Record<string, unknown>;
  transaction: Transaction;
}

@Injectable()
export class OutboxSharedService {
  private readonly logger = new Logger(OutboxSharedService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async createEvent(data: CreateOutboxEventDto): Promise<string> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(data.tenantSlug);
    const id = uuidv4();

    await sequelize.query(
      `INSERT INTO outbox_events (id, tenant_slug, event_type, payload, status, attempts, created_at, updated_at)
       VALUES (:id, :tenantSlug, :eventType, :payload, 'pending', 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantSlug: data.tenantSlug,
          eventType: data.eventType,
          payload: JSON.stringify(data.payload),
        },
        transaction: data.transaction,
      },
    );

    return id;
  }

  async getPendingEvents(tenantSlug: string, limit = 50): Promise<any[]> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [results] = await sequelize.query(
      `SELECT id, tenant_slug, event_type, payload, status, attempts, last_error, created_at
       FROM outbox_events
       WHERE status = 'pending' AND attempts < 3
       ORDER BY created_at ASC
       LIMIT :limit`,
      { replacements: { limit } },
    );
    return results as any[];
  }

  async markProcessed(tenantSlug: string, eventId: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE outbox_events SET status = 'processed', processed_at = NOW(), updated_at = NOW()
       WHERE id = :eventId`,
      { replacements: { eventId } },
    );
  }

  async markFailed(tenantSlug: string, eventId: string, error: string): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `UPDATE outbox_events SET
        attempts = attempts + 1,
        last_error = :error,
        status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END,
        updated_at = NOW()
       WHERE id = :eventId`,
      { replacements: { eventId, error } },
    );
  }
}
