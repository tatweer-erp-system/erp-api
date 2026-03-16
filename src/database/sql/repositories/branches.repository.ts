import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '@/database/sql/entities/branch.entity';

@Injectable()
export class BranchesRepository {
  constructor(@InjectRepository(Branch) private readonly repo: Repository<Branch>) {}

  async findAll(
    filters: { search?: string; isActive?: boolean; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('b').where('b.deleted_at IS NULL');
    if (filters.search)
      qb.andWhere('(b.name_en ILIKE :s OR b.name_ar ILIKE :s OR b.code ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    if (filters.isActive !== undefined) qb.andWhere('b.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Branch> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Branch not found', ar: 'الفرع غير موجود' });
    return entity;
  }

  async findByCode(code: string): Promise<Branch | null> {
    return this.repo.findOne({ where: { code } as any });
  }

  async create(data: Partial<Branch>, ..._opts: any[]): Promise<Branch> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<Branch>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Branch> {
    const entity = await this.findById(id);
    const data: Partial<Branch> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async findForDropdown(
    ..._opts: any[]
  ): Promise<{ id: string; nameEn: string; nameAr: string; code: string }[]> {
    return this.repo
      .createQueryBuilder('b')
      .select(['b.id', 'b.name_en AS "nameEn"', 'b.name_ar AS "nameAr"', 'b.code'])
      .where('b.deleted_at IS NULL')
      .andWhere('b.is_active = true')
      .orderBy('b.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async existsByCode(code: string, ..._opts: any[]): Promise<boolean> {
    return !!(await this.repo.findOne({ where: { code } as any }));
  }
}
