import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosHeldOrder } from '@/database/sql/entities/pos-held-order.entity';

@Injectable()
export class PosHeldOrdersRepository {
  constructor(
    @InjectRepository(PosHeldOrder)
    private readonly repo: Repository<PosHeldOrder>,
  ) {}

  async findBySession(sessionId: string): Promise<PosHeldOrder[]> {
    return this.repo.find({ where: { sessionId } as any, order: { createdAt: 'DESC' } as any });
  }

  async findById(id: string, ..._opts: any[]): Promise<PosHeldOrder> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Held order not found', ar: 'الطلب المعلق غير موجود' });
    }
    return entity;
  }

  async findAllRaw(opts: any): Promise<PosHeldOrder[]> {
    const where = opts?.where ?? {};
    return this.repo.find({
      where: where as any,
      order: opts?.order ? this._normaliseOrder(opts.order) : undefined,
    });
  }

  async create(data: Partial<PosHeldOrder>, ..._opts: any[]): Promise<PosHeldOrder> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async count(opts: any): Promise<number> {
    const where = opts?.where ?? {};
    return this.repo.count({ where: where as any });
  }

  async delete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.delete(id);
  }

  async hardDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.delete(id);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
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
