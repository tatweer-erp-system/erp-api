import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosOrderItem } from '@/database/sql/entities/pos-order-item.entity';

@Injectable()
export class PosOrderItemsRepository {
  constructor(
    @InjectRepository(PosOrderItem)
    private readonly repo: Repository<PosOrderItem>,
  ) {}

  async findById(id: string, ..._opts: any[]): Promise<PosOrderItem> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Order item not found', ar: 'عنصر الطلب غير موجود' });
    }
    return entity;
  }

  async findOne(opts: any): Promise<PosOrderItem | null> {
    const where = opts?.where ?? opts;
    return this.repo.findOne({ where: where as any });
  }

  async findAllRaw(opts: any): Promise<PosOrderItem[]> {
    const where = opts?.where ?? {};
    return this.repo.find({
      where: where as any,
      order: opts?.order ? this._normaliseOrder(opts.order) : undefined,
    });
  }

  async create(data: Partial<PosOrderItem>, ..._opts: any[]): Promise<PosOrderItem> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async bulkCreate(opts: {
    data: Partial<PosOrderItem>[];
    transaction?: any;
  }): Promise<PosOrderItem[]> {
    const entities = this.repo.create(opts.data as any[]);
    return this.repo.save(entities) as any;
  }

  async update(id: string, data: Partial<PosOrderItem>, ..._opts: any[]): Promise<PosOrderItem> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async delete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByOrderId(orderId: string): Promise<void> {
    await this.repo.delete({ orderId } as any);
  }

  // ── Legacy compatibility shims ───────────────────────────────────────────────
  private _normaliseOrder(order: [string, string][]): Record<string, 'ASC' | 'DESC'> {
    const result: Record<string, 'ASC' | 'DESC'> = {};
    for (const [col, dir] of order) {
      const camel = col.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camel] = dir as 'ASC' | 'DESC';
    }
    return result;
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return { commit: async () => {}, rollback: async () => {} };
  }

  async rawQuery<T = any>(..._args: any[]): Promise<T> {
    return [] as unknown as T;
  }
}
