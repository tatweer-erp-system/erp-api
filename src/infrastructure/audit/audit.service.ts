import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(data: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.repo.create({
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
      });
      await this.repo.save(entry);
    } catch (err) {
      this.logger.error('Failed to write audit log', err);
    }
  }

  async findByTenantSlug(
    tenantSlug: string,
    page = 1,
    limit = 20,
  ): Promise<{ rows: AuditLog[]; count: number }> {
    const [rows, count] = await this.repo.findAndCount({
      where: { tenantSlug } as any,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { rows, count };
  }

  async findAll(page = 1, limit = 20): Promise<{ rows: AuditLog[]; count: number }> {
    const [rows, count] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { rows, count };
  }

  async findAllFiltered(
    page: number,
    limit: number,
    filters: AuditLogFilters,
  ): Promise<{ rows: Record<string, unknown>[]; count: number }> {
    const qb = this.repo
      .createQueryBuilder('al')
      .leftJoin('users', 'u', 'u.id::text = al.user_id::text')
      .select([
        'al.id AS id',
        'al.tenant_slug AS "tenantSlug"',
        'al.user_id AS "userId"',
        'u.email AS "userEmail"',
        "TRIM(COALESCE(CONCAT(u.name_en, ''), '')) AS \"userName\"",
        'al.action AS action',
        'al.entity AS entity',
        'al.entity_id AS "entityId"',
        'al.old_values AS "oldValues"',
        'al.new_values AS "newValues"',
        'al.ip_address AS "ipAddress"',
        'al.user_agent AS "userAgent"',
        'al.request_id AS "requestId"',
        'al.created_at AS "createdAt"',
        'al.updated_at AS "updatedAt"',
      ]);

    if (filters.tenantSlug) qb.andWhere('al.tenant_slug = :ts', { ts: filters.tenantSlug });
    if (filters.action) qb.andWhere('al.action = :action', { action: filters.action });
    if (filters.entity) qb.andWhere('al.entity = :entity', { entity: filters.entity });
    if (filters.userId) qb.andWhere('al.user_id = :userId', { userId: filters.userId });
    if (filters.search) {
      qb.andWhere(
        '(al.entity ILIKE :s OR al.action ILIKE :s OR al.tenant_slug ILIKE :s OR al.request_id ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    }
    if (filters.startDate) qb.andWhere('al.created_at >= :sd', { sd: new Date(filters.startDate) });
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('al.created_at <= :ed', { ed: end });
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: 'al.created_at',
      action: 'al.action',
      entity: 'al.entity',
      userId: 'al.user_id',
    };
    const safeSortField = sortFieldMap[filters.sortBy ?? 'createdAt'] ?? 'al.created_at';
    const safeSortOrder: 'ASC' | 'DESC' = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const count = await qb.getCount();
    const rows = (await qb
      .orderBy(safeSortField, safeSortOrder)
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany()) as Record<string, unknown>[];

    return { rows, count };
  }
}
