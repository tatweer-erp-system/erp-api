import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from '@/database/sql/entities/sales-order.entity';
import { SalesOrderLine } from '@/database/sql/entities/sales-order-line.entity';
import { SalesOrderStatus, SalesInvoiceStatus } from '@/common/enums/sales.enums';

@Injectable()
export class SalesOrdersRepository {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly repo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly lineRepo: Repository<SalesOrderLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      status?: SalesOrderStatus;
      customerId?: string;
      invoiceStatus?: SalesInvoiceStatus;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('so')
      .where('so.deleted_at IS NULL')
      .andWhere('so.branch_id = :branchId', { branchId });

    if (filters.status) qb.andWhere('so.status = :status', { status: filters.status });
    if (filters.customerId)
      qb.andWhere('so.customer_id = :customerId', { customerId: filters.customerId });
    if (filters.invoiceStatus)
      qb.andWhere('so.invoice_status = :invoiceStatus', { invoiceStatus: filters.invoiceStatus });

    const [data, total] = await qb
      .orderBy('so.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<SalesOrder> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({ en: 'Sales order not found', ar: 'أمر البيع غير موجود' });
    return entity;
  }

  async findWithLines(id: string): Promise<SalesOrder & { lines: SalesOrderLine[] }> {
    const order = await this.findById(id);
    const lines = await this.lineRepo.find({
      where: { salesOrderId: id } as any,
      order: { sequence: 'ASC' } as any,
    });
    return Object.assign(order, { lines });
  }

  async create(data: Partial<SalesOrder>, ..._opts: any[]): Promise<SalesOrder> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<SalesOrder>,
    ..._opts: any[]
  ): Promise<SalesOrder> {
    const entity = await this.findById(id);
    if (entity.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async upsertLines(orderId: string, lines: Partial<SalesOrderLine>[]): Promise<SalesOrderLine[]> {
    await this.findById(orderId);
    await this.lineRepo.delete({ salesOrderId: orderId } as any);
    const created = this.lineRepo.create(
      lines.map((l, idx) => ({
        ...l,
        salesOrderId: orderId,
        sequence: l.sequence ?? idx,
      })) as any[],
    );
    return this.lineRepo.save(created) as any;
  }

  async confirm(id: string, ..._opts: any[]): Promise<SalesOrder> {
    const entity = await this.findById(id);
    if (entity.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException({
        en: 'Only draft orders can be confirmed',
        ar: 'يمكن تأكيد الطلبات المسودة فقط',
      });
    }
    entity.status = SalesOrderStatus.CONFIRMED;
    entity.confirmedAt = new Date();
    return this.repo.save(entity) as any;
  }

  async cancel(id: string, ..._opts: any[]): Promise<SalesOrder> {
    const entity = await this.findById(id);
    if (entity.status === SalesOrderStatus.DONE) {
      throw new BadRequestException({
        en: 'Completed orders cannot be cancelled',
        ar: 'لا يمكن إلغاء الطلبات المكتملة',
      });
    }
    entity.status = SalesOrderStatus.CANCELLED;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    if (entity.status === SalesOrderStatus.DONE) {
      throw new BadRequestException({
        en: 'Completed orders cannot be deleted',
        ar: 'لا يمكن حذف الطلبات المكتملة',
      });
    }
    await this.repo.softRemove(entity);
  }

  // ── Legacy method aliases (Sequelize-era compatibility) ──────────────────────
  async findOneById(...args: any[]): Promise<SalesOrder> {
    return this.findById(args[args.length - 1]);
  }
  async findByIdOrNull(...args: any[]): Promise<SalesOrder | null> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async insertOrder(...args: any[]): Promise<SalesOrder> {
    const data = args.find((a) => typeof a === 'object' && a !== null && !Array.isArray(a));
    return this.create(data ?? {});
  }
  async updateOrder(...args: any[]): Promise<SalesOrder> {
    const id = typeof args[0] === 'string' ? args[0] : args[1];
    const data = args.find(
      (a) =>
        typeof a === 'object' &&
        a !== null &&
        !Array.isArray(a) &&
        !('id' in a && Object.keys(a).length === 1),
    );
    return this.update(id, 0, data ?? {});
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
  async getNextInvoiceCounter(..._args: any[]): Promise<number> {
    return 0;
  }
  async findOriginalInvoice(..._args: any[]): Promise<any> {
    return null;
  }
}
