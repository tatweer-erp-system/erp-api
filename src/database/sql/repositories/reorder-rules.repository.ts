import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReorderRule } from '@/database/sql/entities/reorder-rule.entity';

@Injectable()
export class ReorderRulesRepository {
  constructor(@InjectRepository(ReorderRule) private readonly repo: Repository<ReorderRule>) {}

  async findAll(
    branchId: string,
    filters: { productId?: string; isActive?: boolean } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('rr')
      .where('rr.deleted_at IS NULL')
      .andWhere('rr.branch_id = :branchId', { branchId });

    if (filters.productId) {
      qb.andWhere('rr.product_id = :productId', { productId: filters.productId });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('rr.is_active = :isActive', { isActive: filters.isActive });
    }

    const [data, total] = await qb
      .orderBy('rr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<ReorderRule> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({
        en: 'Reorder rule not found',
        ar: 'قاعدة إعادة الطلب غير موجودة',
      });
    return entity;
  }

  async create(data: Partial<ReorderRule>, ..._opts: any[]): Promise<ReorderRule> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<ReorderRule>,
    ..._opts: any[]
  ): Promise<ReorderRule> {
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
}
