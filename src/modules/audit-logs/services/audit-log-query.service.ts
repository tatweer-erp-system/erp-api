import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsRepository } from '@/database/sql/repositories/audit-logs.repository';
import { AuditLogFiltersDto } from '../dto/audit-log-filters.dto';
import { AuditLog } from '@/infrastructure/audit/entities/audit-log.entity';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';

const DEFAULT_DAYS_RANGE = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface AuditLogRow {
  id: string;
  tenantSlug: string | null;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuditLogQueryService {
  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async list(
    tenantSlug: string,
    filters: AuditLogFiltersDto,
  ): Promise<{
    data: AuditLogRow[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    let paramIdx = 1;

    const addParam = (value: unknown): string => {
      const key = `p${paramIdx++}`;
      params[key] = value;
      return `:${key}`;
    };

    conditions.push(`tenant_slug = ${addParam(tenantSlug)}`);

    if (filters.entity) conditions.push(`entity = ${addParam(filters.entity)}`);
    if (filters.entityId) conditions.push(`entity_id = ${addParam(filters.entityId)}`);
    if (filters.userId) conditions.push(`user_id = ${addParam(filters.userId)}`);
    if (filters.action) conditions.push(`action = ${addParam(filters.action)}`);

    if (filters.from) {
      conditions.push(`created_at >= ${addParam(new Date(filters.from))}`);
    } else if (!filters.to) {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_DAYS_RANGE);
      conditions.push(`created_at >= ${addParam(defaultFrom)}`);
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(`created_at <= ${addParam(toDate)}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `SELECT COUNT(*)::int AS total FROM public.audit_logs ${whereClause}`;
    const dataSql = `
      SELECT id, tenant_slug AS "tenantSlug", user_id AS "userId", action, entity,
             entity_id AS "entityId", ip_address AS "ipAddress",
             user_agent AS "userAgent", request_id AS "requestId",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM public.audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${addParam(limit)} OFFSET ${addParam((page - 1) * limit)}
    `;

    const [countResult, rows] = await Promise.all([
      this.auditLogsRepository.rawQuery(countSql, params),
      this.auditLogsRepository.rawQuery(dataSql, params),
    ]);

    const total: number = countResult[0]?.total ?? 0;

    return {
      data: rows as AuditLogRow[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantSlug: string, id: string): Promise<AuditLogRow> {
    const params: Record<string, unknown> = { p1: id, p2: tenantSlug };
    const sql = `
      SELECT id, tenant_slug AS "tenantSlug", user_id AS "userId", action, entity,
             entity_id AS "entityId", old_values AS "oldValues", new_values AS "newValues",
             ip_address AS "ipAddress", user_agent AS "userAgent",
             request_id AS "requestId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM public.audit_logs
      WHERE id = :p1 AND tenant_slug = :p2
      LIMIT 1
    `;

    const rows = await this.auditLogsRepository.rawQuery(sql, params);
    const result = rows[0];

    if (!result) {
      throw new NotFoundException(msg(ErrorMessages.AUDIT_LOG_NOT_FOUND, id));
    }

    return result as AuditLogRow;
  }

  async getEntityHistory(
    tenantSlug: string,
    entity: string,
    entityId: string,
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, unknown> = { p1: tenantSlug, p2: entity, p3: entityId };
    const sql = `
      SELECT id, tenant_slug AS "tenantSlug", user_id AS "userId", action, entity,
             entity_id AS "entityId", old_values AS "oldValues", new_values AS "newValues",
             ip_address AS "ipAddress", created_at AS "createdAt"
      FROM public.audit_logs
      WHERE tenant_slug = :p1 AND entity = :p2 AND entity_id = :p3
      ORDER BY created_at DESC
    `;

    const rows = await this.auditLogsRepository.rawQuery(sql, params);

    return rows.map((row: any) => ({
      ...row,
      diff: this.computeDiff(row.oldValues, row.newValues),
    }));
  }

  private computeDiff(
    oldValues: Record<string, unknown> | null | undefined,
    newValues: Record<string, unknown> | null | undefined,
  ): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};

    if (!oldValues && !newValues) return diff;

    if (!oldValues && newValues) {
      for (const key of Object.keys(newValues)) {
        diff[key] = { from: undefined, to: newValues[key] };
      }
      return diff;
    }

    if (oldValues && !newValues) {
      for (const key of Object.keys(oldValues)) {
        diff[key] = { from: oldValues[key], to: undefined };
      }
      return diff;
    }

    const allKeys = new Set([...Object.keys(oldValues!), ...Object.keys(newValues!)]);
    for (const key of allKeys) {
      const oldVal = oldValues![key];
      const newVal = newValues![key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { from: oldVal, to: newVal };
      }
    }

    return diff;
  }
}
