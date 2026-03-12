import { Injectable, Logger } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { TenantSequelizeService } from '../../database/sql/tenant-sequelize.service';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  tenantSlug?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditLogFilters {
  tenantSlug?: string;
  search?: string;
  action?: string;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      sequelize.addModels([AuditLog]);
      await AuditLog.create({
        tenantSlug: data.tenantSlug ?? null,
        userId: data.userId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        oldValues: data.oldValues ?? null,
        newValues: data.newValues ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        requestId: data.requestId ?? null,
      } as any);
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async findByTenantSlug(
    tenantSlug: string,
    page = 1,
    limit = 20,
  ): Promise<{ rows: AuditLog[]; count: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    sequelize.addModels([AuditLog]);
    return AuditLog.findAndCountAll({
      where: { tenantSlug },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });
  }

  async findAll(page = 1, limit = 20): Promise<{ rows: AuditLog[]; count: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    sequelize.addModels([AuditLog]);
    return AuditLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });
  }

  async findAllFiltered(
    page: number,
    limit: number,
    filters: AuditLogFilters,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const conditions: string[] = [];
    const replacements: Record<string, unknown> = {};

    if (filters.tenantSlug) {
      conditions.push('al.tenant_slug = :tenantSlug');
      replacements.tenantSlug = filters.tenantSlug;
    }

    if (filters.action) {
      conditions.push('al.action = :action');
      replacements.action = filters.action;
    }

    if (filters.entity) {
      conditions.push('al.entity = :entity');
      replacements.entity = filters.entity;
    }

    if (filters.userId) {
      conditions.push('al.user_id = :userId');
      replacements.userId = filters.userId;
    }

    if (filters.search) {
      conditions.push(
        `(al.entity ILIKE :search OR al.action ILIKE :search OR al.tenant_slug ILIKE :search
          OR al.request_id ILIKE :search
          OR u.email ILIKE :search OR a.email ILIKE :search
          OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :search
          OR CONCAT(a.first_name, ' ', a.last_name) ILIKE :search)`,
      );
      replacements.search = `%${filters.search}%`;
    }

    if (filters.startDate) {
      conditions.push('al.created_at >= :startDate');
      replacements.startDate = new Date(filters.startDate);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push('al.created_at <= :endDate');
      replacements.endDate = end;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortFieldMap: Record<string, string> = {
      createdAt: 'al.created_at',
      action: 'al.action',
      entity: 'al.entity',
      userId: 'al.user_id',
    };
    const safeSortField = sortFieldMap[filters.sortBy ?? 'createdAt'] ?? 'al.created_at';
    const safeSortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const joinClause = `
      LEFT JOIN public.users u ON u.id = al.user_id
      LEFT JOIN public.admins a ON a.id = al.user_id`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM public.audit_logs al
      ${joinClause}
      ${whereClause}`;

    const dataQuery = `
      SELECT
        al.id,
        al.tenant_slug     AS "tenantSlug",
        al.user_id          AS "userId",
        COALESCE(u.email, a.email) AS "userEmail",
        TRIM(COALESCE(
          NULLIF(CONCAT(COALESCE(u.first_name, a.first_name, ''), ' ', COALESCE(u.last_name, a.last_name, '')), ' '),
          COALESCE(u.email, a.email)
        )) AS "userName",
        CASE
          WHEN a.id IS NOT NULL THEN 'admin'
          WHEN u.id IS NOT NULL THEN 'user'
          ELSE NULL
        END AS "userType",
        al.action,
        al.entity,
        al.entity_id        AS "entityId",
        al.old_values        AS "oldValues",
        al.new_values        AS "newValues",
        al.ip_address        AS "ipAddress",
        al.user_agent        AS "userAgent",
        al.request_id        AS "requestId",
        al.created_at        AS "createdAt",
        al.updated_at        AS "updatedAt"
      FROM public.audit_logs al
      ${joinClause}
      ${whereClause}
      ORDER BY ${safeSortField} ${safeSortOrder}
      LIMIT :limit OFFSET :offset`;

    replacements.limit = limit;
    replacements.offset = (page - 1) * limit;

    const [countResult, rows] = await Promise.all([
      sequelize.query<{ total: number }>(countQuery, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      sequelize.query<Record<string, unknown>>(dataQuery, {
        replacements,
        type: QueryTypes.SELECT,
      }),
    ]);

    return {
      rows,
      count: countResult[0]?.total ?? 0,
    };
  }
}
