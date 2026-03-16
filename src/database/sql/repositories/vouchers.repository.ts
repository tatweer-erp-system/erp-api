import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '@/database/sql/entities/voucher.entity';
import { VoucherStatus } from '@/common/enums/loyalty.enums';

@Injectable()
export class VouchersRepository {
  constructor(
    @InjectRepository(Voucher)
    private readonly repo: Repository<Voucher>,
  ) {}

  async findAll(
    filters: { status?: VoucherStatus; code?: string } = {},
    page = 1,
    limit = 20,
  ): Promise<{ data: Voucher[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder('v').where('v.deleted_at IS NULL');
    if (filters.status) qb.andWhere('v.status = :status', { status: filters.status });
    if (filters.code) qb.andWhere('v.code ILIKE :code', { code: `%${filters.code}%` });
    const [data, total] = await qb
      .orderBy('v.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string, ..._opts: unknown[]): Promise<Voucher> {
    const voucher = await this.repo.findOne({ where: { id } as any });
    if (!voucher) {
      throw new NotFoundException({ en: 'Voucher not found', ar: 'القسيمة غير موجودة' });
    }
    return voucher;
  }

  async findByCode(code: string): Promise<Voucher | null> {
    return this.repo.findOne({ where: { code } as any });
  }

  async create(data: Partial<Voucher>, ..._opts: unknown[]): Promise<Voucher> {
    const entity = this.repo.create(data as Voucher);
    return this.repo.save(entity) as any;
  }

  async update(id: string, version: number, data: Partial<Voucher>): Promise<Voucher> {
    const voucher = await this.findById(id);
    if (voucher.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(voucher, data);
    return this.repo.save(voucher) as any;
  }

  async incrementUsage(id: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Voucher)
      .set({ usageCount: () => 'usage_count + 1' })
      .where('id = :id', { id })
      .execute();
  }

  async softDelete(id: string, ..._opts: unknown[]): Promise<void> {
    const voucher = await this.findById(id);
    await this.repo.softRemove(voucher);
  }
}
