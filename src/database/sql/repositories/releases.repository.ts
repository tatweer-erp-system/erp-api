import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release } from '@/infrastructure/releases/entities/release.entity';

@Injectable()
export class ReleasesRepository {
  constructor(@InjectRepository(Release) private readonly repo: Repository<Release>) {}

  async findAll(filters: { isPublished?: boolean; [key: string]: any } = {}): Promise<Release[]> {
    const qb = this.repo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (filters.isPublished !== undefined)
      qb.andWhere('r.is_published = :p', { p: filters.isPublished });
    return qb.orderBy('r.date', 'DESC').addOrderBy('r.created_at', 'DESC').getMany();
  }

  async findAllRaw(options?: {
    where?: Record<string, unknown>;
    order?: [string, string][];
  }): Promise<Release[]> {
    const qb = this.repo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (options?.where?.isPublished !== undefined) {
      qb.andWhere('r.is_published = :p', { p: options.where.isPublished });
    }
    return qb.orderBy('r.date', 'DESC').addOrderBy('r.created_at', 'DESC').getMany();
  }

  async findById(id: string, ..._opts: any[]): Promise<Release> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Release not found', ar: 'الإصدار غير موجود' });
    return entity;
  }

  async findByIdOrNull(id: string): Promise<Release | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async findOne(options: {
    where: Record<string, unknown>;
    order?: [string, string][];
  }): Promise<Release | null> {
    const qb = this.repo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (options.where.version !== undefined)
      qb.andWhere('r.version = :v', { v: options.where.version });
    if (options.where.isPublished !== undefined)
      qb.andWhere('r.is_published = :p', { p: options.where.isPublished });
    return qb.orderBy('r.date', 'DESC').getOne();
  }

  async create(data: Partial<Release>, _options?: unknown): Promise<Release> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(id: string, data: Partial<Release>, _options?: unknown): Promise<Release> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, _options?: unknown): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
