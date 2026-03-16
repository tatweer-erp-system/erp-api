import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '@/database/sql/entities/admin.entity';

@Injectable()
export class AdminsRepository {
  constructor(@InjectRepository(Admin) private readonly repo: Repository<Admin>) {}

  async findAll(
    filters: { search?: string; isActive?: boolean; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('a').where('a.deleted_at IS NULL');

    if (filters.search) {
      qb.andWhere('(a.email ILIKE :s OR a.first_name ILIKE :s OR a.last_name ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('a.is_active = :isActive', { isActive: filters.isActive });
    }

    const pageNum = filters.page ?? page;
    const limitNum = filters.limit ?? limit;
    const sortBy = filters.sortBy ?? 'created_at';
    const sortOrder: 'ASC' | 'DESC' =
      (filters.sortOrder as 'ASC' | 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    const safeSort = ['created_at', 'email', 'first_name', 'last_name'].includes(sortBy)
      ? sortBy
      : 'created_at';

    const [data, total] = await qb
      .orderBy(`a.${safeSort}`, sortOrder)
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      rows: data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findById(id: string): Promise<Admin> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException({ en: 'Admin not found', ar: 'المدير غير موجود' });
    }
    return entity;
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.repo.findOne({ where: { email, deletedAt: null as any } });
  }

  async create(data: Partial<Admin>, ..._opts: any[]): Promise<Admin> {
    const entity = this.repo.create(data as Admin);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    versionOrData: number | Partial<Admin>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<Admin> {
    const entity = await this.findById(id);
    const data: Partial<Admin> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }
}
