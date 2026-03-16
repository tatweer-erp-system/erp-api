import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingRecord } from '@/database/sql/entities/training-record.entity';

@Injectable()
export class TrainingRecordsRepository {
  constructor(
    @InjectRepository(TrainingRecord)
    private readonly repo: Repository<TrainingRecord>,
  ) {}

  async findAll(
    branchId: string,
    employeeId?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: TrainingRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.repo
      .createQueryBuilder('tr')
      .where('tr.deleted_at IS NULL')
      .andWhere('tr.branch_id = :branchId', { branchId });

    if (employeeId) {
      qb.andWhere('tr.employee_id = :employeeId', { employeeId });
    }

    const [data, total] = await qb
      .orderBy('tr.start_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<TrainingRecord> {
    const entity = await this.repo.findOne({ where: { id } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Training record not found', ar: 'سجل التدريب غير موجود' });
    }
    return entity;
  }

  async findByIdOrNull(id: string, ..._opts: any[]): Promise<TrainingRecord | null> {
    return this.repo.findOne({ where: { id } as any });
  }

  async create(data: Partial<TrainingRecord>, ..._opts: any[]): Promise<TrainingRecord> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: string,
    versionOrData: number | Partial<TrainingRecord>,
    dataOrOpts?: any,
    ..._opts: any[]
  ): Promise<TrainingRecord> {
    const entity = await this.findById(id);
    const data: Partial<TrainingRecord> =
      typeof versionOrData === 'number' ? (dataOrOpts ?? {}) : versionOrData;
    Object.assign(entity, data);
    return this.repo.save(entity) as any;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  // ── Legacy method aliases ────────────────────────────────────────────────────
  async findOne(opts: any): Promise<TrainingRecord | null> {
    const where = opts?.where ?? {};
    return this.repo.findOne({ where } as any);
  }

  async createTransaction(..._args: any[]): Promise<any> {
    return {
      commit: async () => {},
      rollback: async () => {},
    };
  }
}
