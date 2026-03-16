import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payslip } from '@/database/sql/entities/payslip.entity';
import { PayslipLine } from '@/database/sql/entities/payslip-line.entity';
import { PayslipStatus } from '@/common/enums/payroll.enums';

@Injectable()
export class PayslipsRepository {
  constructor(
    @InjectRepository(Payslip)
    private readonly repo: Repository<Payslip>,
    @InjectRepository(PayslipLine)
    private readonly lineRepo: Repository<PayslipLine>,
  ) {}

  async findAll(
    branchId: string,
    filters: {
      employeeId?: string;
      status?: PayslipStatus;
      periodFrom?: string;
      periodTo?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const qb = this.repo
      .createQueryBuilder('ps')
      .where('ps.deleted_at IS NULL')
      .andWhere('ps.branch_id = :b', { b: branchId });

    if (filters.employeeId) qb.andWhere('ps.employee_id = :e', { e: filters.employeeId });
    if (filters.status) qb.andWhere('ps.status = :s', { s: filters.status });
    if (filters.periodFrom) qb.andWhere('ps.period_from >= :pf', { pf: filters.periodFrom });
    if (filters.periodTo) qb.andWhere('ps.period_to <= :pt', { pt: filters.periodTo });

    const result = await qb
      .orderBy('ps.period_from', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const data = result[0] as Payslip[];
    const total = result[1] as number;

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Payslip> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({ en: 'Payslip not found', ar: 'كشف الراتب غير موجود' });
    }
    return e;
  }

  async findWithLines(id: string) {
    const payslip = await this.findById(id);
    const lines = await this.lineRepo.find({
      where: { payslipId: id } as any,
      order: { sequence: 'ASC' as const },
    });
    return { ...payslip, lines };
  }

  async create(data: Partial<Payslip>, ..._opts: any[]): Promise<Payslip> {
    const entity = this.repo.create(data as Payslip);
    return this.repo.save(entity) as unknown as Promise<Payslip>;
  }

  async update(
    id: string,
    version: number,
    data: Partial<Payslip>,
    ..._opts: any[]
  ): Promise<Payslip> {
    const e = await this.findById(id);
    if (e.version !== version) {
      throw new ConflictException({ en: 'Version mismatch', ar: 'تعارض في الإصدار' });
    }
    Object.assign(e, data);
    return this.repo.save(e) as unknown as Promise<Payslip>;
  }

  async upsertLines(payslipId: string, lines: Partial<PayslipLine>[]): Promise<PayslipLine[]> {
    await this.lineRepo.delete({ payslipId } as any);
    if (!lines.length) return [];
    const entities = lines.map((l, i) =>
      this.lineRepo.create({ ...l, payslipId, sequence: l.sequence ?? i } as PayslipLine),
    );
    return this.lineRepo.save(entities) as unknown as Promise<PayslipLine[]>;
  }

  async confirm(id: string, ..._opts: any[]): Promise<Payslip> {
    const e = await this.findById(id);
    e.status = PayslipStatus.CONFIRMED;
    return this.repo.save(e) as unknown as Promise<Payslip>;
  }

  async cancel(id: string, ..._opts: any[]): Promise<Payslip> {
    const e = await this.findById(id);
    e.status = PayslipStatus.CANCELLED;
    return this.repo.save(e) as unknown as Promise<Payslip>;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
