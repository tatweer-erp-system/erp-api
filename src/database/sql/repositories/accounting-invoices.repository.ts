import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingInvoice } from '@/database/sql/entities/accounting-invoice.entity';
import { AccountingInvoiceLine } from '@/database/sql/entities/accounting-invoice-line.entity';
import { AccountingDocType, AccountingDocStatus } from '@/common/enums/accounting.enums';

@Injectable()
export class AccountingInvoicesRepository {
  constructor(
    @InjectRepository(AccountingInvoice) private readonly repo: Repository<AccountingInvoice>,
    @InjectRepository(AccountingInvoiceLine)
    private readonly lineRepo: Repository<AccountingInvoiceLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      docType?: AccountingDocType;
      status?: AccountingDocStatus;
      partnerId?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('inv')
      .where('inv.deleted_at IS NULL')
      .andWhere('inv.branch_id = :b', { b: branchId });
    if (filters.docType) qb.andWhere('inv.doc_type = :t', { t: filters.docType });
    if (filters.status) qb.andWhere('inv.status = :s', { s: filters.status });
    if (filters.partnerId) qb.andWhere('inv.partner_id = :p', { p: filters.partnerId });
    const [data, total] = await qb
      .orderBy('inv.invoice_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<AccountingInvoice> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Invoice not found', ar: 'الفاتورة غير موجودة' });
    return e;
  }

  async findWithLines(id: string) {
    const inv = await this.findById(id);
    const lines = await this.lineRepo.find({
      where: { invoiceId: id } as any,
      order: { sequence: 'ASC' },
    });
    return { ...inv, lines };
  }

  async create(data: Partial<AccountingInvoice>, ..._opts: any[]): Promise<AccountingInvoice> {
    const entity = this.repo.create(data as unknown as AccountingInvoice);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<AccountingInvoice>,
  ): Promise<AccountingInvoice> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async upsertLines(invoiceId: string, lines: Partial<AccountingInvoiceLine>[]): Promise<void> {
    await this.lineRepo.delete({ invoiceId } as any);
    if (lines.length) {
      const lineEntities = lines.map((l, i) =>
        this.lineRepo.create({ ...l, invoiceId, sequence: i } as unknown as AccountingInvoiceLine),
      );
      await this.lineRepo.save(lineEntities);
    }
  }
}
