import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveAllocation } from '@/database/sql/entities/leave-allocation.entity';
import { LeaveAllocationStatus } from '@/common/enums/hr.enums';

@Injectable()
export class LeaveAllocationsRepository {
  constructor(
    @InjectRepository(LeaveAllocation) private readonly repo: Repository<LeaveAllocation>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      employeeId?: string;
      leaveTypeId?: string;
      year?: number;
      status?: LeaveAllocationStatus;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('la')
      .where('la.deleted_at IS NULL')
      .andWhere('la.branch_id = :branchId', { branchId });

    if (filters.employeeId) qb.andWhere('la.employee_id = :empId', { empId: filters.employeeId });
    if (filters.leaveTypeId) qb.andWhere('la.leave_type_id = :ltId', { ltId: filters.leaveTypeId });
    if (filters.year) qb.andWhere('la.year = :year', { year: filters.year });
    if (filters.status) qb.andWhere('la.status = :status', { status: filters.status });

    const [data, total] = await qb
      .orderBy('la.year', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<LeaveAllocation> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({
        en: 'Leave allocation not found',
        ar: 'تخصيص الإجازة غير موجود',
      });
    return e;
  }

  async create(data: Partial<LeaveAllocation>, ..._opts: any[]): Promise<LeaveAllocation> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<LeaveAllocation>,
  ): Promise<LeaveAllocation> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async approve(id: string, approvedById: string): Promise<LeaveAllocation> {
    const e = await this.findById(id);
    e.status = LeaveAllocationStatus.APPROVED;
    e.approvedById = approvedById;
    e.approvedAt = new Date();
    return this.repo.save(e) as any;
  }

  async refuse(id: string): Promise<LeaveAllocation> {
    const e = await this.findById(id);
    e.status = LeaveAllocationStatus.REFUSED;
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
