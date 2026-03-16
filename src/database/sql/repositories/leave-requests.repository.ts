import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveRequest } from '@/database/sql/entities/leave-request.entity';
import { LeaveRequestStatus } from '@/common/enums/hr.enums';

@Injectable()
export class LeaveRequestsRepository {
  constructor(@InjectRepository(LeaveRequest) private readonly repo: Repository<LeaveRequest>) {}

  async findAll(
    branchId: string,
    filters: {
      employeeId?: string;
      leaveTypeId?: string;
      status?: LeaveRequestStatus;
      year?: number;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('lr')
      .where('lr.deleted_at IS NULL')
      .andWhere('lr.branch_id = :branchId', { branchId });

    if (filters.employeeId) qb.andWhere('lr.employee_id = :empId', { empId: filters.employeeId });
    if (filters.leaveTypeId) qb.andWhere('lr.leave_type_id = :ltId', { ltId: filters.leaveTypeId });
    if (filters.status) qb.andWhere('lr.status = :status', { status: filters.status });
    if (filters.year)
      qb.andWhere('EXTRACT(YEAR FROM lr.date_from) = :year', { year: filters.year });

    const [data, total] = await qb
      .orderBy('lr.date_from', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<LeaveRequest> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({ en: 'Leave request not found', ar: 'طلب الإجازة غير موجود' });
    return e;
  }

  async create(data: Partial<LeaveRequest>, ..._opts: any[]): Promise<LeaveRequest> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    version: number,
    data: Partial<LeaveRequest>,
    ..._opts: any[]
  ): Promise<LeaveRequest> {
    const e = await this.findById(id);
    if (e.version !== version)
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    Object.assign(e, data);
    return this.repo.save(e) as any;
  }

  async approve(id: string, approvedById: string): Promise<LeaveRequest> {
    const e = await this.findById(id);
    e.status = LeaveRequestStatus.APPROVED;
    e.approvedById = approvedById;
    e.approvedAt = new Date();
    return this.repo.save(e) as any;
  }

  async refuse(id: string, reason: string): Promise<LeaveRequest> {
    const e = await this.findById(id);
    e.status = LeaveRequestStatus.REFUSED;
    e.refusalReason = reason;
    return this.repo.save(e) as any;
  }

  async cancel(id: string, ..._opts: any[]): Promise<LeaveRequest> {
    const e = await this.findById(id);
    e.status = LeaveRequestStatus.CANCELLED;
    return this.repo.save(e) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
