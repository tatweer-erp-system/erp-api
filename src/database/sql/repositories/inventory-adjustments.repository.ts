import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryAdjustment } from '@/database/sql/entities/inventory-adjustment.entity';
import { InventoryAdjustmentLine } from '@/database/sql/entities/inventory-adjustment-line.entity';
import { AdjustmentStatus } from '@/common/enums/inventory.enums';

@Injectable()
export class InventoryAdjustmentsRepository {
  constructor(
    @InjectRepository(InventoryAdjustment)
    private readonly repo: Repository<InventoryAdjustment>,
    @InjectRepository(InventoryAdjustmentLine)
    private readonly lineRepo: Repository<InventoryAdjustmentLine>,
  ) {}

  async findAll(branchId: string, status?: AdjustmentStatus, page = 1, limit = 20) {
    const qb = this.repo
      .createQueryBuilder('ia')
      .where('ia.deleted_at IS NULL')
      .andWhere('ia.branch_id = :branchId', { branchId });

    if (status) qb.andWhere('ia.status = :status', { status });

    const [data, total] = await qb
      .orderBy('ia.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<InventoryAdjustment> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({
        en: 'Inventory adjustment not found',
        ar: 'تسوية المخزون غير موجودة',
      });
    return entity;
  }

  async findWithLines(
    id: string,
  ): Promise<InventoryAdjustment & { lines: InventoryAdjustmentLine[] }> {
    const adjustment = await this.findById(id);
    const lines = await this.lineRepo.find({ where: { adjustmentId: id } as any });
    return Object.assign(adjustment, { lines });
  }

  async create(data: Partial<InventoryAdjustment>, ..._opts: any[]): Promise<InventoryAdjustment> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async upsertLines(
    adjustmentId: string,
    lines: Partial<InventoryAdjustmentLine>[],
  ): Promise<InventoryAdjustmentLine[]> {
    await this.findById(adjustmentId);
    // Delete existing lines and replace with the new set
    await this.lineRepo.delete({ adjustmentId } as any);
    const created = this.lineRepo.create(lines.map((l) => ({ ...l, adjustmentId })) as any[]);
    return this.lineRepo.save(created) as any;
  }

  async validate(id: string): Promise<InventoryAdjustment> {
    const entity = await this.findById(id);
    if (entity.status !== AdjustmentStatus.DRAFT) {
      throw new BadRequestException({
        en: 'Only draft adjustments can be validated',
        ar: 'يمكن التحقق من التسويات المسودة فقط',
      });
    }
    entity.status = AdjustmentStatus.VALIDATED;
    entity.validatedAt = new Date();
    return this.repo.save(entity) as any;
  }

  async cancel(id: string, ..._opts: any[]): Promise<InventoryAdjustment> {
    const entity = await this.findById(id);
    if (entity.status === AdjustmentStatus.VALIDATED) {
      throw new BadRequestException({
        en: 'Validated adjustments cannot be cancelled',
        ar: 'لا يمكن إلغاء التسويات المتحقق منها',
      });
    }
    entity.status = AdjustmentStatus.CANCELLED;
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    if (entity.status === AdjustmentStatus.VALIDATED) {
      throw new BadRequestException({
        en: 'Validated adjustments cannot be deleted',
        ar: 'لا يمكن حذف التسويات المتحقق منها',
      });
    }
    await this.repo.softRemove(entity);
  }
}
