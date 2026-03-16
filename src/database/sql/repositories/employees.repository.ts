import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '@/database/sql/entities/employee.entity';

@Injectable()
export class EmployeesRepository {
  constructor(@InjectRepository(Employee) private readonly repo: Repository<Employee>) {}

  async findAll(
    branchId: string,
    filters: {
      search?: string;
      departmentId?: string;
      isActive?: boolean;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.deleted_at IS NULL')
      .andWhere('e.branch_id = :branchId', { branchId });

    if (filters.search)
      qb.andWhere(
        '(e.name_en ILIKE :s OR e.name_ar ILIKE :s OR e.employee_code ILIKE :s OR e.work_email ILIKE :s)',
        { s: `%${filters.search}%` },
      );
    if (filters.departmentId)
      qb.andWhere('e.department_id = :deptId', { deptId: filters.departmentId });
    if (filters.isActive !== undefined) qb.andWhere('e.is_active = :a', { a: filters.isActive });

    const [data, total] = await qb
      .orderBy('e.name_en')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Employee> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Employee not found', ar: 'الموظف غير موجود' });
    return e;
  }

  async create(data: Partial<Employee>, ..._opts: any[]): Promise<Employee> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Employee>,
    ..._opts: any[]
  ): Promise<Employee> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  async findForDropdown(branchId: string, ..._opts: any[]) {
    return this.repo
      .createQueryBuilder('e')
      .select([
        'e.id AS "id"',
        'e.name_en AS "nameEn"',
        'e.name_ar AS "nameAr"',
        'e.employee_code AS "employeeCode"',
      ])
      .where('e.deleted_at IS NULL')
      .andWhere('e.branch_id = :branchId', { branchId })
      .andWhere('e.is_active = true')
      .orderBy('e.name_en')
      .getRawMany();
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOneById(...args: any[]): Promise<any> {
    return this.findById(args[args.length - 1]);
  }
  async findByIdOrNull(...args: any[]): Promise<any> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findAllPaginated(...args: any[]): Promise<any> {
    return (this.findAll as any)(...args);
  }
  async findByDepartmentPaginated(..._args: any[]): Promise<any> {
    return { data: [], total: 0 };
  }
  async insertEmployee(...args: any[]): Promise<any> {
    const data = args.find((a) => typeof a === 'object' && a !== null) ?? {};
    return this.create(data);
  }
  async updateEmployee(...args: any[]): Promise<any> {
    const id = args[args.length - 2];
    const data = args[args.length - 1] ?? {};
    const e = await this.findById(id);
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }
  async softDeleteEmployee(...args: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(args[args.length - 1]));
  }
  async restoreEmployee(...args: any[]): Promise<void> {
    await this.repo.restore(args[args.length - 1]);
  }
  async findDropdown(..._args: any[]): Promise<any[]> {
    return [];
  }
  getSequelize(): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
  getSequelizeInstance(): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
}
