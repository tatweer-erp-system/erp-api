import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosPayment } from '@/database/sql/entities/pos-payment.entity';

@Injectable()
export class PosPaymentsRepository {
  constructor(
    @InjectRepository(PosPayment)
    private readonly repo: Repository<PosPayment>,
  ) {}

  async findByOrder(orderId: string): Promise<PosPayment[]> {
    return this.repo.find({ where: { orderId } as any, order: { createdAt: 'ASC' } as any });
  }

  async findBySession(sessionId: string): Promise<PosPayment[]> {
    // Join through orders to get payments for a session
    return this.repo
      .createQueryBuilder('pp')
      .innerJoin('pos_orders', 'po', 'po.id = pp.order_id')
      .where('po.session_id = :sessionId', { sessionId })
      .andWhere('pp.deleted_at IS NULL')
      .getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<PosPayment> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Payment not found', ar: 'الدفعة غير موجودة' });
    }
    return entity;
  }

  async findAllRaw(opts: any): Promise<PosPayment[]> {
    const where = opts?.where ?? {};
    return this.repo.find({
      where: where as any,
      order: opts?.order ? this._normaliseOrder(opts.order) : undefined,
    });
  }

  async create(data: Partial<PosPayment>, ..._opts: any[]): Promise<PosPayment> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
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
