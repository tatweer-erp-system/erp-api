import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicHoliday } from '@/database/sql/entities/public-holiday.entity';

@Injectable()
export class PublicHolidaysRepository {
  constructor(
    @InjectRepository(PublicHoliday)
    private readonly repo: Repository<PublicHoliday>,
  ) {}

  async findAll(
    year?: number,
    page = 1,
    limit = 50,
  ): Promise<{
    data: PublicHoliday[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo.createQueryBuilder('ph').where('ph.deleted_at IS NULL');

    if (year !== undefined) {
      qb.andWhere('ph.year = :year', { year });
    }

    const [data, total] = await qb
      .orderBy('ph.date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<PublicHoliday> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({
        en: 'Public holiday not found',
        ar: 'العطلة الرسمية غير موجودة',
      });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<PublicHoliday | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<PublicHoliday>, ..._opts: any[]): Promise<PublicHoliday> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<PublicHoliday>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<PublicHoliday> {
    const entity = await this.findById(id);
    const data: Partial<PublicHoliday> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }
}
