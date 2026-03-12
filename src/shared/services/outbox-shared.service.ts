import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';

export interface CreateOutboxEventDto {
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  transaction: Transaction;
  referenceId?: string;
  referenceType?: string;
}

@Injectable()
export class OutboxSharedService {
  private readonly logger = new Logger(OutboxSharedService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async createEvent(data: CreateOutboxEventDto): Promise<string>;
  async createEvent(
    transaction: Transaction,
    tenantId: string,
    eventType: string,
    payload: Record<string, unknown>,
    referenceId?: string,
    referenceType?: string,
  ): Promise<string>;
  async createEvent(
    dataOrTransaction: CreateOutboxEventDto | Transaction,
    tenantId?: string,
    eventType?: string,
    payload?: Record<string, unknown>,
    referenceId?: string,
    referenceType?: string,
  ): Promise<string> {
    let resolvedData: CreateOutboxEventDto;

    if (tenantId !== undefined && eventType !== undefined && payload !== undefined) {
      resolvedData = {
        transaction: dataOrTransaction as Transaction,
        tenantId,
        eventType,
        payload,
        referenceId,
        referenceType,
      };
    } else {
      resolvedData = dataOrTransaction as CreateOutboxEventDto;
    }

    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();

    await sequelize.query(
      `INSERT INTO outbox_events (id, tenant_id, event_type, payload, status, attempts, reference_id, reference_type, created_at, updated_at)
       VALUES (:id, :tenantId, :eventType, :payload, 'pending', 0, :referenceId, :referenceType, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId: resolvedData.tenantId,
          eventType: resolvedData.eventType,
          payload: JSON.stringify(resolvedData.payload),
          referenceId: resolvedData.referenceId ?? null,
          referenceType: resolvedData.referenceType ?? null,
        },
        transaction: resolvedData.transaction,
      },
    );

    return id;
  }

  async getPendingEvents(tenantId: string, limit = 50): Promise<any[]> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [results] = await sequelize.query(
      `SELECT id, tenant_id, event_type, payload, status, attempts, last_error, reference_id, reference_type, created_at
       FROM outbox_events
       WHERE tenant_id = :tenantId AND status = 'pending' AND attempts < 5
       ORDER BY created_at ASC
       LIMIT :limit`,
      { replacements: { tenantId, limit } },
    );
    return results as any[];
  }

  async markProcessed(tenantId: string, eventId: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET status = 'processed', processed_at = NOW(), updated_at = NOW()
       WHERE id = :eventId AND tenant_id = :tenantId`,
      { replacements: { eventId, tenantId } },
    );
  }

  async markFailed(tenantId: string, eventId: string, error: string): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE outbox_events SET
        attempts = attempts + 1,
        last_error = :error,
        status = CASE WHEN attempts + 1 >= 5 THEN 'dead' ELSE 'pending' END,
        updated_at = NOW()
       WHERE id = :eventId AND tenant_id = :tenantId`,
      { replacements: { eventId, tenantId, error } },
    );
  }
}
