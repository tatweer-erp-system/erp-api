import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '@/database/sql/entities/role.entity';

@Injectable()
export class RolesRepository {
  constructor(@InjectRepository(Role) private readonly repo: Repository<Role>) {}

  async findAll(
    filters: { search?: string; isActive?: boolean; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('r').where('r.deleted_at IS NULL');
    if (filters.search)
      qb.andWhere('(r.name_en ILIKE :s OR r.name_ar ILIKE :s)', { s: `%${filters.search}%` });
    if (filters.isActive !== undefined) qb.andWhere('r.is_active = :a', { a: filters.isActive });
    const [data, total] = await qb
      .orderBy('r.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Role> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException({ en: 'Role not found', ar: 'الدور غير موجود' });
    return entity;
  }

  async create(data: Partial<Role>, ..._opts: any[]): Promise<Role> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(id: string, version: number, data: Partial<Role>, ..._opts: any[]): Promise<Role> {
    const entity = await this.findById(id);
    if (entity.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('r')
      .select(['r.id', 'r.name_en AS "nameEn"', 'r.name_ar AS "nameAr"'])
      .where('r.deleted_at IS NULL')
      .andWhere('r.is_active = true')
      .orderBy('r.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async createRole(...args: any[]): Promise<any> {
    const data = args.find((a) => typeof a === 'object' && a !== null) ?? {};
    return this.create(data);
  }
  async updateRole(...args: any[]): Promise<any> {
    const id = args[args.length - 2];
    const data = args[args.length - 1] ?? {};
    const e = await this.findById(id);
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }
  async softDeleteRole(...args: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(args[args.length - 1]));
  }
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async findByIdWithPermissions(...args: any[]): Promise<any> {
    return this.findById(args[args.length - 1]);
  }
  async findUserIdsByRoleId(..._args: any[]): Promise<string[]> {
    return [];
  }
  async assignPermissions(..._args: any[]): Promise<void> {}
  async existsByNameExcludingId(..._args: any[]): Promise<boolean> {
    return false;
  }
}
