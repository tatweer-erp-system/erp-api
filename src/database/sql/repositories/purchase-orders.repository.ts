import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from '@/database/sql/entities/purchase-order.entity';
import { PurchaseOrderLine } from '@/database/sql/entities/purchase-order-line.entity';
import {
  PurchaseOrderStatus,
  PurchaseBillStatus,
  PurchaseReceiptStatus,
} from '@/common/enums/purchasing.enums';

@Injectable()
export class PurchaseOrdersRepository {
  constructor(
    @InjectRepository(PurchaseOrder) private readonly repo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly linesRepo: Repository<PurchaseOrderLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      status?: PurchaseOrderStatus;
      vendorId?: string;
      invoiceStatus?: PurchaseBillStatus;
      receiptStatus?: PurchaseReceiptStatus;
      search?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('po')
      .where('po.deleted_at IS NULL')
      .andWhere('po.branch_id = :branchId', { branchId });

    if (filters.status) qb.andWhere('po.status = :status', { status: filters.status });
    if (filters.vendorId) qb.andWhere('po.vendor_id = :vendorId', { vendorId: filters.vendorId });
    if (filters.invoiceStatus)
      qb.andWhere('po.invoice_status = :invoiceStatus', {
        invoiceStatus: filters.invoiceStatus,
      });
    if (filters.receiptStatus)
      qb.andWhere('po.receipt_status = :receiptStatus', {
        receiptStatus: filters.receiptStatus,
      });
    if (filters.search) qb.andWhere('po.reference ILIKE :s', { s: `%${filters.search}%` });

    const [data, total] = await qb
      .orderBy('po.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PurchaseOrder> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({ en: 'Purchase order not found', ar: 'أمر الشراء غير موجود' });
    return e;
  }

  async findWithLines(id: string): Promise<PurchaseOrder & { lines: PurchaseOrderLine[] }> {
    const order = await this.findById(id);
    const lines = await this.linesRepo.find({
      where: { purchaseOrderId: id } as any,
      order: { sequence: 'ASC' } as any,
    });
    return { ...order, lines };
  }

  async create(data: Partial<PurchaseOrder>, ..._opts: any[]): Promise<PurchaseOrder> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<PurchaseOrder>,
    ..._opts: any[]
  ): Promise<PurchaseOrder> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async upsertLines(
    orderId: string,
    lines: Partial<PurchaseOrderLine>[],
  ): Promise<PurchaseOrderLine[]> {
    const existing = await this.linesRepo.find({
      where: { purchaseOrderId: orderId } as any,
    });
    const existingIds = new Set(existing.map((l) => l.id));
    const incomingIds = new Set(lines.filter((l) => l.id).map((l) => l.id!));

    // Delete lines no longer present
    const toDelete = existing.filter((l) => !incomingIds.has(l.id));
    if (toDelete.length) await this.linesRepo.remove(toDelete as any);

    // Upsert
    const saved: PurchaseOrderLine[] = [];
    for (const line of lines) {
      if (line.id && existingIds.has(line.id)) {
        const found = existing.find((l) => l.id === line.id)!;
        Object.assign(found, { ...line, purchaseOrderId: orderId });
        saved.push(await this.linesRepo.save(found));
      } else {
        const newLine = this.linesRepo.create({ ...line, purchaseOrderId: orderId } as any);
        saved.push(await this.linesRepo.save(newLine as unknown as PurchaseOrderLine));
      }
    }
    return saved;
  }

  async confirm(id: string, ..._opts: any[]): Promise<PurchaseOrder> {
    const e = await this.findById(id);
    e.status = PurchaseOrderStatus.CONFIRMED;
    e.confirmedAt = new Date();
    return this.repo.save(e) as any;
  }

  async cancel(id: string, ..._opts: any[]): Promise<PurchaseOrder> {
    const e = await this.findById(id);
    e.status = PurchaseOrderStatus.CANCELLED;
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  // ── Legacy method aliases (Sequelize-era compatibility) ──────────────────────
  async findOneById(...args: any[]): Promise<PurchaseOrder> {
    return this.findById(args[args.length - 1]);
  }
  async findByIdOrNull(...args: any[]): Promise<PurchaseOrder | null> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async insertOrder(...args: any[]): Promise<PurchaseOrder> {
    const data = args.find((a) => typeof a === 'object' && a !== null);
    return this.create(data ?? {});
  }
  async updateOrder(...args: any[]): Promise<PurchaseOrder> {
    const id = typeof args[0] === 'string' ? args[0] : args[1];
    const data = args.find((a) => typeof a === 'object' && a !== null) ?? {};
    return this.update(id, 0, data);
  }
  async softDeleteOrder(...args: any[]): Promise<void> {
    return this.softDelete(args[args.length - 1]);
  }
  getSequelize(..._args: any[]): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
  getSequelizeInstance(..._args: any[]): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
}
