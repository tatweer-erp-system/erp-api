import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantTable } from '@/database/sql/entities/restaurant-table.entity';
import { TableStatus } from '@/common/enums/restaurant.enums';

@Injectable()
export class RestaurantTablesRepository {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly repo: Repository<RestaurantTable>,
  ) {}

  async findAll(
    branchId: string,
    sectionId?: string,
    status?: TableStatus,
    page = 1,
    limit = 50,
  ): Promise<{
    data: RestaurantTable[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.deleted_at IS NULL')
      .andWhere('t.branch_id = :branchId', { branchId });

    if (sectionId) {
      qb.andWhere('t.section_id = :sectionId', { sectionId });
    }
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }

    const [data, total] = await qb
      .orderBy('t.number', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<RestaurantTable> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Table not found', ar: 'الطاولة غير موجودة' });
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<RestaurantTable | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<RestaurantTable>, ..._opts: any[]): Promise<RestaurantTable> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<RestaurantTable>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<RestaurantTable> {
    const entity = await this.findById(id);
    const data: Partial<RestaurantTable> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async updateStatus(id: string, status: TableStatus, ..._opts: any[]): Promise<RestaurantTable> {
    const entity = await this.findById(id);
    entity.status = status;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<RestaurantTable | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
