import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '@/database/sql/entities/attendance-record.entity';
import { AttendanceStatus } from '@/common/enums/hr.enums';

@Injectable()
export class AttendanceRecordsRepository {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly repo: Repository<AttendanceRecord>,
  ) {}

  async findAll(
    branchIdOrFilters: string | any,
    filters: {
      employeeId?: string;
      date?: string;
      month?: number;
      year?: number;
      status?: AttendanceStatus;
      [key: string]: any;
    } = {},
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
      .createQueryBuilder('ar')
      .where('ar.deleted_at IS NULL')
      .andWhere('ar.branch_id = :branchId', { branchId });

    if (filters.employeeId) qb.andWhere('ar.employee_id = :empId', { empId: filters.employeeId });
    if (filters.date) qb.andWhere('ar.date = :date', { date: filters.date });
    if (filters.month)
      qb.andWhere('EXTRACT(MONTH FROM ar.date) = :month', { month: filters.month });
    if (filters.year) qb.andWhere('EXTRACT(YEAR FROM ar.date) = :year', { year: filters.year });
    if (filters.status) qb.andWhere('ar.status = :status', { status: filters.status });

    const [data, total] = await qb
      .orderBy('ar.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<AttendanceRecord> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e)
      throw new NotFoundException({
        en: 'Attendance record not found',
        ar: 'سجل الحضور غير موجود',
      });
    return e;
  }

  async create(data: Partial<AttendanceRecord>, ..._opts: any[]): Promise<AttendanceRecord> {
    return this.repo.save(this.repo.create(data as any)) as any;
  }

  async update(
    id: string,
    versionOrData: number | any,
    data?: Partial<AttendanceRecord> | any,
    ..._opts: any[]
  ): Promise<AttendanceRecord> {
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

  async checkIn(employeeId: string, branchId: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.repo
      .createQueryBuilder('ar')
      .where('ar.deleted_at IS NULL')
      .andWhere('ar.employee_id = :employeeId', { employeeId })
      .andWhere('ar.branch_id = :branchId', { branchId })
      .andWhere('ar.date = :today', { today })
      .getOne();

    if (existing) {
      if (existing.checkIn)
        throw new BadRequestException({
          en: 'Already checked in today',
          ar: 'تم تسجيل الحضور بالفعل اليوم',
        });
      existing.checkIn = new Date();
      existing.status = AttendanceStatus.PRESENT;
      return this.repo.save(existing) as any;
    }

    return this.repo.save(
      this.repo.create({
        employeeId,
        branchId,
        date: today,
        checkIn: new Date(),
        status: AttendanceStatus.PRESENT,
      } as any),
    ) as any;
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findByIdOrNull(id: string, ..._opts: any[]): Promise<AttendanceRecord | null> {
    return this.repo.findOne({ where: { id } as any });
  }
  async createTransaction(..._args: any[]): Promise<any> {
    return null;
  }
  async sumDailyHours(..._args: any[]): Promise<number> {
    return 0;
  }
  async getReportSummary(..._args: any[]): Promise<any> {
    return {};
  }

  async checkOut(employeeId: string, branchId: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];

    const record = await this.repo
      .createQueryBuilder('ar')
      .where('ar.deleted_at IS NULL')
      .andWhere('ar.employee_id = :employeeId', { employeeId })
      .andWhere('ar.branch_id = :branchId', { branchId })
      .andWhere('ar.date = :today', { today })
      .getOne();

    if (!record || !record.checkIn)
      throw new BadRequestException({
        en: 'No check-in found for today',
        ar: 'لا يوجد تسجيل حضور لهذا اليوم',
      });

    if (record.checkOut)
      throw new BadRequestException({
        en: 'Already checked out today',
        ar: 'تم تسجيل الانصراف بالفعل اليوم',
      });

    record.checkOut = new Date();
    const diffMs = record.checkOut.getTime() - record.checkIn.getTime();
    record.workedHours = (diffMs / (1000 * 60 * 60)).toFixed(4);

    return this.repo.save(record) as any;
  }
}
