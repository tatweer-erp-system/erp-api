import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingPayment } from '@/database/sql/entities/accounting-payment.entity';
import { AccountingPaymentStatus } from '@/common/enums/accounting.enums';

@Injectable()
export class AccountingPaymentsRepository {
  constructor(
    @InjectRepository(AccountingPayment) private readonly repo: Repository<AccountingPayment>,
  ) {}

  async findAll(
    branchId: string,
    filters: { status?: AccountingPaymentStatus; partnerId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.deleted_at IS NULL')
      .andWhere('p.branch_id = :b', { b: branchId });
    if (filters.status) qb.andWhere('p.status = :s', { s: filters.status });
    if (filters.partnerId) qb.andWhere('p.partner_id = :p', { p: filters.partnerId });
    const [data, total] = await qb
      .orderBy('p.payment_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<AccountingPayment> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Payment not found', ar: 'الدفعة غير موجودة' });
    return e;
  }

  async create(data: Partial<AccountingPayment>, ..._opts: any[]): Promise<AccountingPayment> {
    const entity = this.repo.create(data as unknown as AccountingPayment);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<AccountingPayment>,
  ): Promise<AccountingPayment> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async post(id: string, ..._opts: any[]): Promise<AccountingPayment> {
    const e = await this.findById(id);
    e.status = AccountingPaymentStatus.POSTED;
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
