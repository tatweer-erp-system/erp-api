import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/database/sql/entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findAll(
    filtersOrTenant:
      | { search?: string; isActive?: boolean; branchId?: string; [key: string]: any }
      | string = {},
    pageOrFilters: any = 1,
    limitOrPage: any = 20,
  ) {
    const filters: any =
      typeof filtersOrTenant === 'string' ? (pageOrFilters ?? {}) : filtersOrTenant;
    const page =
      typeof filtersOrTenant === 'string'
        ? (limitOrPage ?? 1)
        : typeof pageOrFilters === 'number'
          ? pageOrFilters
          : 1;
    const limit =
      typeof filtersOrTenant === 'string' ? 20 : typeof limitOrPage === 'number' ? limitOrPage : 20;
    const qb = this.repo.createQueryBuilder('u').where('u.deleted_at IS NULL');
    if (filters.search)
      qb.andWhere('(u.name_en ILIKE :s OR u.name_ar ILIKE :s OR u.email ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    if (filters.isActive !== undefined) qb.andWhere('u.is_active = :a', { a: filters.isActive });
    if (filters.branchId) qb.andWhere('u.branch_id = :b', { b: filters.branchId });
    const [data, total] = await qb
      .orderBy('u.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<User> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'User not found', ar: 'المستخدم غير موجود' });
    return entity;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } as any });
  }

  async create(data: Partial<User>, ..._opts: any[]): Promise<User> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    idOrTenant: string,
    versionOrId: number | string,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<User> {
    // Support legacy: update(tenantId, id, data, ...) and update(id, version, data, ...)
    const id = typeof versionOrId === 'string' ? versionOrId : idOrTenant;
    const data: Partial<User> =
      typeof versionOrId === 'string' ? (dataOrOpts ?? {}) : (dataOrOpts ?? {});
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async assignRoles(..._args: any[]): Promise<void> {}
  async existsByEmail(...args: any[]): Promise<boolean> {
    const email = args[args.length - 1];
    return !!(await this.repo.findOne({ where: { email } as any }));
  }
  async updatePasswordHash(id: string, passwordHash: string, ..._opts: any[]): Promise<void> {
    await this.repo.update(id, { passwordHash } as any);
  }
  async extraPermissions(..._args: any[]): Promise<any[]> {
    return [];
  }
  async revokedPermissions(..._args: any[]): Promise<any[]> {
    return [];
  }
}
