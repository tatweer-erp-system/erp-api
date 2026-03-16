import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMove } from '@/database/sql/entities/stock-move.entity';
import { StockMoveStatus } from '@/common/enums/inventory.enums';

@Injectable()
export class StockMovesRepository {
  constructor(@InjectRepository(StockMove) private readonly repo: Repository<StockMove>) {}

  async findAll(
    branchId: string,
    filters: { status?: StockMoveStatus; productId?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('sm')
      .where('sm.deleted_at IS NULL')
      .andWhere('sm.branch_id = :branchId', { branchId });

    if (filters.status) {
      qb.andWhere('sm.status = :status', { status: filters.status });
    }
    if (filters.productId) {
      qb.andWhere('sm.product_id = :productId', { productId: filters.productId });
    }

    const [data, total] = await qb
      .orderBy('sm.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<StockMove> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({ en: 'Stock move not found', ar: 'حركة المخزون غير موجودة' });
    return entity;
  }

  async create(data: Partial<StockMove>, ..._opts: any[]): Promise<StockMove> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<StockMove>,
    ..._opts: any[]
  ): Promise<StockMove> {
    const entity = await this.findById(id);
    if (entity.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async done(id: string): Promise<StockMove> {
    const entity = await this.findById(id);
    if (entity.status !== StockMoveStatus.CONFIRMED) {
      throw new ConflictException({
        en: 'Only confirmed moves can be marked as done',
        ar: 'يمكن تأكيد الحركات المؤكدة فقط',
      });
    }
    entity.status = StockMoveStatus.DONE;
    entity.movedAt = new Date();
    return this.repo.save(entity) as any;
  }
}
