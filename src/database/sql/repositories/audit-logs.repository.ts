import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from '@/infrastructure/audit/entities/audit-log.entity';

@Injectable()
export class AuditLogsRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async rawQuery(sql: string, params: Record<string, unknown>): Promise<any[]> {
    // Convert named params (:paramName) to positional ($1, $2, ...) for pg
    const values: unknown[] = [];
    const converted = sql.replace(/:(\w+)/g, (_match, name) => {
      if (name in params) {
        values.push(params[name]);
        return `$${values.length}`;
      }
      return _match;
    });
    return this.dataSource.query(converted, values);
  }

  async findAll(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      branchId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    page: number,
    limit: number,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.repo.createQueryBuilder('al');

    if (filters.userId) qb.andWhere('al.user_id = :userId', { userId: filters.userId });
    if (filters.action) qb.andWhere('al.action = :action', { action: filters.action });
    if (filters.resource) qb.andWhere('al.entity = :entity', { entity: filters.resource });
    if (filters.dateFrom) qb.andWhere('al.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('al.created_at <= :dateTo', { dateTo: filters.dateTo });

    const [data, total] = await qb
      .orderBy('al.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string): Promise<AuditLog | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<AuditLog>): Promise<AuditLog> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
}
