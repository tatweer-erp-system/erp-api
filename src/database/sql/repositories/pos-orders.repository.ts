import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosOrder } from '@/database/sql/entities/pos-order.entity';
import { PosOrderItem } from '@/database/sql/entities/pos-order-item.entity';
import { PosOrderStatus } from '@/common/enums/pos.enums';

@Injectable()
export class PosOrdersRepository {
  constructor(
    @InjectRepository(PosOrder)
    private readonly repo: Repository<PosOrder>,
    @InjectRepository(PosOrderItem)
    private readonly itemRepo: Repository<PosOrderItem>,
  ) {}

  async findAll(
    branchIdOrFilters: string | any,
    filters: {
      sessionId?: string;
      status?: PosOrderStatus;
      customerId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? null);
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }

    const qb = this.repo.createQueryBuilder('po').where('po.deleted_at IS NULL');
    if (branchId) qb.andWhere('po.branch_id = :branchId', { branchId });
    if (filters.sessionId)
      qb.andWhere('po.session_id = :sessionId', { sessionId: filters.sessionId });
    if (filters.status) qb.andWhere('po.status = :status', { status: filters.status });
    if (filters.customerId)
      qb.andWhere('po.customer_id = :customerId', { customerId: filters.customerId });
    if (filters.dateFrom) qb.andWhere('po.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('po.created_at <= :dateTo', { dateTo: filters.dateTo });

    const [data, total] = await qb
      .orderBy('po.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PosOrder> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Order not found', ar: 'الطلب غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<PosOrder | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findWithItems(id: string): Promise<PosOrder & { items: PosOrderItem[] }> {
    const order = await this.findById(id);
    const items = await this.itemRepo.find({
      where: { orderId: id } as any,
      order: { sequence: 'ASC' } as any,
    });
    return Object.assign(order, { items });
  }

  async findOne(opts: any): Promise<PosOrder | null> {
    const where = opts?.where ?? opts;
    return this.repo.findOne({ where: where as any });
  }

  async create(data: Partial<PosOrder>, ..._opts: any[]): Promise<PosOrder> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<PosOrder>,
    dataOrOpts?: Partial<PosOrder> | any,
    ..._opts: any[]
  ): Promise<PosOrder> {
    const data: Partial<PosOrder> =
      typeof versionOrData === 'number' ? (dataOrOpts as Partial<PosOrder>) : versionOrData;
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async upsertItems(orderId: string, items: Partial<PosOrderItem>[]): Promise<PosOrderItem[]> {
    await this.itemRepo.delete({ orderId } as any);
    const created = this.itemRepo.create(
      items.map((item, idx) => ({ ...item, orderId, sequence: item.sequence ?? idx })) as any[],
    );
    return this.itemRepo.save(created) as any;
  }

  async pay(id: string, paymentData: Partial<PosOrder>, ..._opts: any[]): Promise<PosOrder> {
    const entity = await this.findById(id);
    Object.assign(entity, paymentData, { status: PosOrderStatus.PAID, paidAt: new Date() });
    return this.repo.save(entity) as any;
  }

  async void(id: string, reason?: string, ..._opts: any[]): Promise<PosOrder> {
    const entity = await this.findById(id);
    entity.status = PosOrderStatus.VOIDED;
    if (reason) entity.notes = reason;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Legacy compatibility shims ───────────────────────────────────────────────
  async findAllRaw(opts: any): Promise<PosOrder[]> {
    const where = opts?.where ?? {};
    return this.repo.find({
      where: where as any,
      order: opts?.order ? this._normaliseOrder(opts.order) : undefined,
    });
  }

  private _normaliseOrder(order: [string, string][]): Record<string, 'ASC' | 'DESC'> {
    const result: Record<string, 'ASC' | 'DESC'> = {};
    for (const [col, dir] of order) {
      const camel = col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camel] = dir as 'ASC' | 'DESC';
    }
    return result;
  }

  async count(opts: any): Promise<number> {
    const where = opts?.where ?? {};
    return this.repo.count({ where: where as any });
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return { commit: async () => {}, rollback: async () => {} };
  }

  async rawQuery<T = any>(..._args: any[]): Promise<T> {
    return [] as unknown as T;
  }

  async bulkCreate(opts: any): Promise<void> {
    const entities = this.itemRepo.create(opts?.data ?? []);
    await this.itemRepo.save(entities);
  }
}
