import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from '@/database/sql/entities/delivery.entity';
import { DeliveryLine } from '@/database/sql/entities/delivery-line.entity';
import { DeliveryStatus } from '@/common/enums/sales.enums';

@Injectable()
export class DeliveriesRepository {
  constructor(
    @InjectRepository(Delivery)
    private readonly repo: Repository<Delivery>,
    @InjectRepository(DeliveryLine)
    private readonly lineRepo: Repository<DeliveryLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: { status?: DeliveryStatus; salesOrderId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.deleted_at IS NULL')
      .andWhere('d.branch_id = :branchId', { branchId });

    if (filters.status) qb.andWhere('d.status = :status', { status: filters.status });
    if (filters.salesOrderId)
      qb.andWhere('d.sales_order_id = :salesOrderId', { salesOrderId: filters.salesOrderId });

    const [data, total] = await qb
      .orderBy('d.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Delivery> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Delivery not found', ar: 'التسليم غير موجود' });
    return entity;
  }

  async findWithLines(id: string): Promise<Delivery & { lines: DeliveryLine[] }> {
    const delivery = await this.findById(id);
    const lines = await this.lineRepo.find({ where: { deliveryId: id } as any });
    return Object.assign(delivery, { lines });
  }

  async create(data: Partial<Delivery>, ..._opts: any[]): Promise<Delivery> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Delivery>,
    ..._opts: any[]
  ): Promise<Delivery> {
    const entity = await this.findById(id);
    if (entity.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async upsertLines(deliveryId: string, lines: Partial<DeliveryLine>[]): Promise<DeliveryLine[]> {
    await this.findById(deliveryId);
    await this.lineRepo.delete({ deliveryId } as any);
    const created = this.lineRepo.create(lines.map((l) => ({ ...l, deliveryId })) as any[]);
    return this.lineRepo.save(created) as any;
  }

  async done(id: string): Promise<Delivery> {
    const entity = await this.findById(id);
    if (entity.status !== DeliveryStatus.READY) {
      throw new BadRequestException({
        en: 'Only ready deliveries can be marked as done',
        ar: 'يمكن إكمال عمليات التسليم الجاهزة فقط',
      });
    }
    entity.status = DeliveryStatus.DONE;
    entity.doneDate = new Date();
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    if (entity.status === DeliveryStatus.DONE) {
      throw new BadRequestException({
        en: 'Completed deliveries cannot be deleted',
        ar: 'لا يمكن حذف عمليات التسليم المكتملة',
      });
    }
    await this.repo.softRemove(entity);
  }
}
