import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '@/database/sql/entities/department.entity';

@Injectable()
export class DepartmentsRepository {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {}

  async findAll(
    filters: { search?: string; isActive?: boolean; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo.createQueryBuilder('d').where('d.deleted_at IS NULL');

    if (filters.search)
      qb.andWhere('(d.name_en ILIKE :s OR d.name_ar ILIKE :s)', { s: `%${filters.search}%` });
    if (filters.isActive !== undefined) qb.andWhere('d.is_active = :a', { a: filters.isActive });

    const [data, total] = await qb
      .orderBy('d.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Department> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Department not found', ar: 'القسم غير موجود' });
    return e;
  }

  async create(data: Partial<Department>, ..._opts: any[]): Promise<Department> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Department>,
    ..._opts: any[]
  ): Promise<Department> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(..._opts: any[]) {
    return this.repo
      .createQueryBuilder('d')
      .select(['d.id AS "id"', 'd.name_en AS "nameEn"', 'd.name_ar AS "nameAr"'])
      .where('d.deleted_at IS NULL')
      .andWhere('d.is_active = true')
      .orderBy('d.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOneById(...args: any[]): Promise<any> {
    return this.findById(args[args.length - 1]);
  }
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async findDropdown(..._args: any[]): Promise<any[]> {
    return [];
  }
  async insertDepartment(...args: any[]): Promise<any> {
    const data = args.find((a) => typeof a === 'object' && a !== null) ?? {};
    return this.create(data);
  }
  async updateDepartment(...args: any[]): Promise<any> {
    const id = args[args.length - 2];
    const data = args[args.length - 1] ?? {};
    const e = await this.findById(id);
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }
  async softDeleteDepartment(...args: any[]): Promise<void> {
    await this.softDelete(args[args.length - 1]);
  }
}
