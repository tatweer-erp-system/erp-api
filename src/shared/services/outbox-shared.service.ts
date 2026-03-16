import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOutboxEventDto {
  tenantId: string;
  tenantSlug?: string;
  eventType: string;
  payload: Record<string, unknown>;
  /** @deprecated transactions are managed by the caller; pass null */
  transaction?: unknown;
  referenceId?: string;
  referenceType?: string;
}

@Injectable()
export class OutboxSharedService {
  private readonly logger = new Logger(OutboxSharedService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async createEvent(
    dataOrTransaction: CreateOutboxEventDto | unknown,
    tenantIdOrOpts?: string,
    eventType?: string,
    payload?: Record<string, unknown>,
    referenceId?: string,
    referenceType?: string,
  ): Promise<string> {
    // Support legacy 6-arg call: createEvent(transaction, tenantId, eventType, payload, refId, refType)
    let data: CreateOutboxEventDto;
    if (typeof tenantIdOrOpts === 'string') {
      data = {
        tenantId: tenantIdOrOpts,
        eventType: eventType!,
        payload: payload ?? {},
        referenceId,
        referenceType,
      };
    } else {
      data = dataOrTransaction as CreateOutboxEventDto;
    }
    return this._createEvent(data);
  }

  private async _createEvent(data: CreateOutboxEventDto): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();

    await sequelize.query(
      `INSERT INTO outbox_events (id, "tenantId", "tenantSlug", "eventType", payload, status, attempts, "referenceId", "referenceType", "createdAt")
       VALUES (:id, :tenantId, :tenantSlug, :eventType, :payload, 'pending', 0, :referenceId, :referenceType, NOW())`,
      {
        replacements: {
          id,
          tenantId: data.tenantId,
          tenantSlug: data.tenantSlug ?? 'unknown',
          eventType: data.eventType,
          payload: JSON.stringify(data.payload),
          referenceId: data.referenceId ?? null,
          referenceType: data.referenceType ?? null,
        },
      },
    );

    return id;
  }

  async getPendingEvents(tenantId: string, limit = 50): Promise<any[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [results] = await sequelize.query(
      `SELECT id, "tenantId", "eventType", payload, status, attempts, "lastError", "referenceId", "referenceType", "createdAt"
       FROM outbox_events
       WHERE "tenantId" = :tenantId AND status = 'pending' AND attempts < 5
       ORDER BY "createdAt" ASC
       LIMIT :limit`,
      { replacements: { tenantId, limit } },
    );
    return results as any[];
  }

  async markProcessed(tenantId: string, eventId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET status = 'processed', "processedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = :eventId AND "tenantId" = :tenantId`,
      { replacements: { eventId, tenantId } },
    );
  }

  async markFailed(tenantId: string, eventId: string, error: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET
        attempts = attempts + 1,
        "lastError" = :error,
        status = CASE WHEN attempts + 1 >= 5 THEN 'dead' ELSE 'pending' END,
        "updatedAt" = NOW()
       WHERE id = :eventId AND "tenantId" = :tenantId`,
      { replacements: { eventId, tenantId, error } },
    );
  }
}
