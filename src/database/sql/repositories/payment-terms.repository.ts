import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTerm } from '@/database/sql/entities/payment-term.entity';
import { PaymentTermLine } from '@/database/sql/entities/payment-term-line.entity';

@Injectable()
export class PaymentTermsRepository {
  constructor(
    @InjectRepository(PaymentTerm) private readonly repo: Repository<PaymentTerm>,
    @InjectRepository(PaymentTermLine) private readonly lineRepo: Repository<PaymentTermLine>,
  ) {}

  async findAll(searchOrFilters?: string | any, pageArg = 1, limitArg = 20) {
    const search =
      typeof searchOrFilters === 'string'
        ? searchOrFilters
        : (searchOrFilters?.search ?? undefined);
    const page =
      typeof searchOrFilters === 'object' && searchOrFilters?.page ? searchOrFilters.page : pageArg;
    const limit =
      typeof searchOrFilters === 'object' && searchOrFilters?.limit
        ? searchOrFilters.limit
        : limitArg;
    const qb = this.repo.createQueryBuilder('pt').where('pt.deleted_at IS NULL');
    if (search) qb.andWhere('(pt.name_en ILIKE :s OR pt.name_ar ILIKE :s)', { s: `%${search}%` });
    const [data, total] = await qb
      .orderBy('pt.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PaymentTerm> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({ en: 'Payment term not found', ar: 'شرط الدفع غير موجود' });
    return e;
  }

  async findWithLines(id: string) {
    const term = await this.findById(id);
    const lines = await this.lineRepo.find({
      where: { paymentTermId: id } as any,
      order: { sequence: 'ASC' },
    });
    return { ...term, lines };
  }

  async create(data: Partial<PaymentTerm>, ..._opts: any[]): Promise<PaymentTerm> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    versionOrData: number | any,
    data?: Partial<PaymentTerm> | any,
    ..._opts: any[]
  ): Promise<PaymentTerm> {
    const version = typeof versionOrData === 'number' ? versionOrData : 0;
    if (data === undefined) data = versionOrData;
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async upsertLines(paymentTermId: string, lines: Partial<PaymentTermLine>[]): Promise<void> {
    await this.lineRepo.delete({ paymentTermId } as any);
    if (lines.length)
      await (this.lineRepo.save as any)(
        lines.map(
          (l: any, i: number) =>
            this.lineRepo.create({
              ...l,
              paymentTermId,
              sequence: i,
            } as any) as unknown as PaymentTermLine,
        ),
      );
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('pt')
      .select(['pt.id', 'pt.name_en AS "nameEn"', 'pt.name_ar AS "nameAr"'])
      .where('pt.deleted_at IS NULL')
      .orderBy('pt.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(id: string, ..._opts: any[]): Promise<any> {
    return this.repo.findOne({ where: { id } as any });
  }
}
