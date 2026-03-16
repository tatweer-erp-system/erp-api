import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLocation } from '@/database/sql/entities/stock-location.entity';
import { LocationType } from '@/common/enums/inventory.enums';

@Injectable()
export class StockLocationsRepository {
  constructor(@InjectRepository(StockLocation) private readonly repo: Repository<StockLocation>) {}

  async findAll(
    filters: {
      warehouseId?: string;
      locationType?: LocationType;
      isActive?: boolean;
      [key: string]: any;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('sl').where('sl.deleted_at IS NULL');

    if (filters.warehouseId) {
      qb.andWhere('sl.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    }
    if (filters.locationType) {
      qb.andWhere('sl.location_type = :locationType', { locationType: filters.locationType });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('sl.is_active = :isActive', { isActive: filters.isActive });
    }

    const [data, total] = await qb
      .orderBy('sl.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<StockLocation> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity)
      throw new NotFoundException({ en: 'Stock location not found', ar: 'موقع المخزون غير موجود' });
    return entity;
  }

  async create(data: Partial<StockLocation>, ..._opts: any[]): Promise<StockLocation> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<StockLocation>,
    ..._opts: any[]
  ): Promise<StockLocation> {
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

  async findForDropdown(
    warehouseIdOrTenant?: any,
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string; locationType: LocationType }[]> {
    const warehouseId =
      typeof warehouseIdOrTenant === 'string' && warehouseIdOrTenant.length >= 36
        ? warehouseIdOrTenant
        : undefined;
    const qb = this.repo
      .createQueryBuilder('sl')
      .select([
        'sl.id',
        'sl.name_en AS "nameEn"',
        'sl.name_ar AS "nameAr"',
        'sl.location_type AS "locationType"',
      ])
      .where('sl.deleted_at IS NULL')
      .andWhere('sl.is_active = true');

    if (warehouseId) {
      qb.andWhere('sl.warehouse_id = :warehouseId', { warehouseId });
    }

    return qb.orderBy('sl.name_en').getRawMany();
  }
}
