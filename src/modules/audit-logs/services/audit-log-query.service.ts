import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsRepository } from '@/database/sql/repositories/audit-logs.repository';
import { AuditLogFiltersDto } from '../dto/audit-log-filters.dto';
import { PaginatedResult } from '@/common/interfaces/pagination.interface';
import { AuditLog } from '@/database/sql/entities/audit-log.entity';
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
  ): Promise<PaginatedResult<AuditLogRow>> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: string[] = ['"tenantSlug" = :tenantSlug'];
    const replacements: Record<string, unknown> = { tenantSlug };

    if (filters.entity) {
      conditions.push('entity = :entity');
      replacements.entity = filters.entity;
    }

    if (filters.entityId) {
      conditions.push('"entityId" = :entityId');
      replacements.entityId = filters.entityId;
    }

    if (filters.userId) {
      conditions.push('"userId" = :userId');
      replacements.userId = filters.userId;
    }

    if (filters.action) {
      conditions.push('action = :action');
      replacements.action = filters.action;
    }

    // Default to last 30 days if no date range
    if (filters.from) {
      conditions.push('"createdAt" >= :from');
      replacements.from = new Date(filters.from);
    } else if (!filters.to) {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - DEFAULT_DAYS_RANGE);
      conditions.push('"createdAt" >= :from');
      replacements.from = defaultFrom;
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push('"createdAt" <= :to');
      replacements.to = toDate;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    replacements.limit = limit;
    replacements.offset = offset;

    const countSql = `SELECT COUNT(*)::int AS total FROM public.audit_logs ${whereClause}`;
    const dataSql = `
      SELECT id, "tenantSlug", "userId", action, entity, "entityId",
             "ipAddress", "userAgent", "requestId", "createdAt", "updatedAt"
      FROM public.audit_logs
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT :limit OFFSET :offset
    `;

    const [countResult, rows] = await Promise.all([
      this.auditLogsRepository.rawQuery<{ total: number }[]>(countSql, replacements),
      this.auditLogsRepository.rawQuery<AuditLogRow[]>(dataSql, replacements),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantSlug: string, id: string): Promise<AuditLogRow> {
    const sql = `
      SELECT id, "tenantSlug", "userId", action, entity, "entityId",
             "oldValues", "newValues", "ipAddress", "userAgent", "requestId",
             "createdAt", "updatedAt"
      FROM public.audit_logs
      WHERE id = :id AND "tenantSlug" = :tenantSlug
      LIMIT 1
    `;

    const rows = await this.auditLogsRepository.rawQuery<AuditLogRow[]>(sql, { id, tenantSlug });
    const result = rows[0];

    if (!result) {
      throw new NotFoundException(msg(ErrorMessages.AUDIT_LOG_NOT_FOUND, id));
    }

    return result;
  }

  async getEntityHistory(
    tenantSlug: string,
    entity: string,
    entityId: string,
  ): Promise<Record<string, unknown>[]> {
    const sql = `
      SELECT id, "tenantSlug", "userId", action, entity, "entityId",
             "oldValues", "newValues", "ipAddress", "createdAt"
      FROM public.audit_logs
      WHERE "tenantSlug" = :tenantSlug AND entity = :entity AND "entityId" = :entityId
      ORDER BY "createdAt" DESC
    `;

    const rows = await this.auditLogsRepository.rawQuery<AuditLogRow[]>(sql, {
      tenantSlug,
      entity,
      entityId,
    });

    return rows.map((row) => ({
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
