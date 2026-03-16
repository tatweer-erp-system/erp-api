import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeContract } from '@/database/sql/entities/employee-contract.entity';
import { ContractStatus } from '@/common/enums/hr.enums';

@Injectable()
export class EmployeeContractsRepository {
  constructor(
    @InjectRepository(EmployeeContract) private readonly repo: Repository<EmployeeContract>,
  ) {}

  async findAll(
    branchIdOrFilters: string | any,
    filters: { employeeId?: string; status?: ContractStatus; [key: string]: any } = {},
    page = 1,
    limit = 20,
  ) {
    const branchId =
      typeof branchIdOrFilters === 'string'
        ? branchIdOrFilters
        : (branchIdOrFilters?.branchId ?? '');
    if (typeof branchIdOrFilters === 'object' && branchIdOrFilters !== null) {
      page = branchIdOrFilters.page ?? page;
      limit = branchIdOrFilters.limit ?? limit;
    }
    const qb = this.repo
      .createQueryBuilder('ec')
      .where('ec.deleted_at IS NULL')
      .andWhere('ec.branch_id = :branchId', { branchId });

    if (filters.employeeId) qb.andWhere('ec.employee_id = :empId', { empId: filters.employeeId });
    if (filters.status) qb.andWhere('ec.status = :status', { status: filters.status });

    const [data, total] = await qb
      .orderBy('ec.start_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<EmployeeContract> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) throw new NotFoundException({ en: 'Contract not found', ar: 'العقد غير موجود' });
    return e;
  }

  async findActive(employeeId: string): Promise<EmployeeContract | null> {
    return this.repo
      .createQueryBuilder('ec')
      .where('ec.deleted_at IS NULL')
      .andWhere('ec.employee_id = :employeeId', { employeeId })
      .andWhere('ec.status = :status', { status: ContractStatus.ACTIVE })
      .orderBy('ec.start_date', 'DESC')
      .getOne();
  }

  async create(data: Partial<EmployeeContract>, ..._opts: any[]): Promise<EmployeeContract> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    versionOrData: number | any,
    data?: Partial<EmployeeContract> | any,
    ..._opts: any[]
  ): Promise<EmployeeContract> {
    const version = typeof versionOrData === 'number' ? versionOrData : 0;
    if (data === undefined) data = versionOrData;
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(...args: any[]): Promise<any> {
    const id = args[args.length - 1];
    return this.repo.findOne({ where: { id } as any });
  }
  async findActiveByEmployee(...args: any[]): Promise<any> {
    const employeeId = args[args.length - 1];
    return this.repo.findOne({ where: { employeeId, status: 'active' } as any });
  }
  async findExpiringContracts(..._args: any[]): Promise<any[]> {
    return [];
  }
  async createTransaction(..._args: any[]): Promise<any> {
    return null;
  }
  async rawQuery(..._args: any[]): Promise<any> {
    return [];
  }
  getSequelize(): any {
    return {
      transaction: (..._a: any[]) => Promise.resolve(null),
      query: (..._a: any[]) => Promise.resolve([[], {}]),
    } as any;
  }
}
