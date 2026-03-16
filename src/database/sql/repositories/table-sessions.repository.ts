import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableSession } from '@/database/sql/entities/table-session.entity';

@Injectable()
export class TableSessionsRepository {
  constructor(
    @InjectRepository(TableSession)
    private readonly repo: Repository<TableSession>,
  ) {}

  async findAll(
    branchId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: TableSession[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('ts')
      .where('ts.deleted_at IS NULL')
      .andWhere('ts.branch_id = :branchId', { branchId });

    const [data, total] = await qb
      .orderBy('ts.opened_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<TableSession> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Table session not found', ar: 'جلسة الطاولة غير موجودة' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<TableSession | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<TableSession>, ..._opts: any[]): Promise<TableSession> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<TableSession>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<TableSession> {
    const entity = await this.findById(id);
    const data: Partial<TableSession> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async findActiveByTable(tableId: string): Promise<TableSession | null> {
    return this.repo.findOne({
      where: { tableId, isActive: true } as any,
    });
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<TableSession | null> {
    const where = opts?.where ?? {};
    // Map legacy 'releasedAt: null' check to isActive
    if (where.releasedAt === null) {
      delete where.releasedAt;
      where.isActive = true;
    }
    return this.repo.findOne({ where } as any);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
