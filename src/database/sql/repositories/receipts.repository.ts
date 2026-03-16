import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '@/database/sql/entities/receipt.entity';
import { ReceiptLine } from '@/database/sql/entities/receipt-line.entity';
import { ReceiptStatus } from '@/common/enums/purchasing.enums';

@Injectable()
export class ReceiptsRepository {
  constructor(
    @InjectRepository(Receipt) private readonly repo: Repository<Receipt>,
    @InjectRepository(ReceiptLine) private readonly linesRepo: Repository<ReceiptLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      status?: ReceiptStatus;
      purchaseOrderId?: string;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .andWhere('r.branch_id = :branchId', { branchId });

    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.purchaseOrderId)
      qb.andWhere('r.purchase_order_id = :poId', { poId: filters.purchaseOrderId });
    if (filters.search) qb.andWhere('r.reference ILIKE :s', { s: `%${filters.search}%` });

    const [data, total] = await qb
      .orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Receipt> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Receipt not found', ar: 'الاستلام غير موجود' });
    return e;
  }

  async findWithLines(id: string): Promise<Receipt & { lines: ReceiptLine[] }> {
    const receipt = await this.findById(id);
    const lines = await this.linesRepo.find({
      where: { receiptId: id } as any,
    });
    return { ...receipt, lines };
  }

  async create(data: Partial<Receipt>, ..._opts: any[]): Promise<Receipt> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Receipt>,
    ..._opts: any[]
  ): Promise<Receipt> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async upsertLines(receiptId: string, lines: Partial<ReceiptLine>[]): Promise<ReceiptLine[]> {
    const existing = await this.linesRepo.find({
      where: { receiptId } as any,
    });
    const existingIds = new Set(existing.map((l) => l.id));
    const incomingIds = new Set(lines.filter((l) => l.id).map((l) => l.id!));

    const toDelete = existing.filter((l) => !incomingIds.has(l.id));
    if (toDelete.length) await this.linesRepo.remove(toDelete as any);

    const saved: ReceiptLine[] = [];
    for (const line of lines) {
      if (line.id && existingIds.has(line.id)) {
        const found = existing.find((l) => l.id === line.id)!;
        Object.assign(found, { ...line, receiptId });
        saved.push(await this.linesRepo.save(found));
      } else {
        const newLine = this.linesRepo.create({ ...line, receiptId } as any);
        saved.push(await this.linesRepo.save(newLine as unknown as ReceiptLine));
      }
    }
    return saved;
  }

  async done(id: string): Promise<Receipt> {
    const e = await this.findById(id);
    e.status = ReceiptStatus.DONE;
    e.doneDate = new Date().toISOString().split('T')[0];
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
