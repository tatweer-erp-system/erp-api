import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantNote } from '@/database/sql/entities/tenant-note.entity';

@Injectable()
export class TenantNotesRepository {
  constructor(@InjectRepository(TenantNote) private readonly repo: Repository<TenantNote>) {}

  async findAll(
    filters: {
      tenantId?: string;
      search?: string;
      where?: Record<string, unknown>;
      [key: string]: any;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('n').where('n.deleted_at IS NULL');

    const tenantId = filters.tenantId ?? (filters.where as any)?.tenantId;
    if (tenantId) {
      qb.andWhere('n.tenant_id = :tenantId', { tenantId });
    }

    if (filters.search) {
      qb.andWhere('n.content ILIKE :s', { s: `%${filters.search}%` });
    }

    const pageNum = filters.page ?? page;
    const limitNum = filters.limit ?? limit;
    const sortBy = filters.sortBy ?? 'created_at';
    const sortOrder: 'ASC' | 'DESC' =
      (filters.sortOrder as 'ASC' | 'DESC') === 'ASC' ? 'ASC' : 'DESC';

    const [data, total] = await qb
      .orderBy(`n.${sortBy === 'createdAt' ? 'created_at' : sortBy}`, sortOrder)
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      rows: data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findById(id: string): Promise<TenantNote> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException({ en: 'Note not found', ar: 'الملاحظة غير موجودة' });
    }
    return entity;
  }

  async create(data: Partial<TenantNote>, ..._opts: any[]): Promise<TenantNote> {
    const entity = this.repo.create(data as TenantNote);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    versionOrData: number | Partial<TenantNote>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<TenantNote> {
    const entity = await this.findById(id);
    const data: Partial<TenantNote> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }
}
