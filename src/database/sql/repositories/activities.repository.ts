import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Activity } from '@/database/sql/entities/activity.entity';

@Injectable()
export class ActivitiesRepository {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
  ) {}

  async findByRecord(recordModel: string, recordId: string, page = 1, limit = 20) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.deleted_at IS NULL')
      .andWhere('a.record_model = :m', { m: recordModel })
      .andWhere('a.record_id = :r', { r: recordId });

    const result = await qb
      .orderBy('a.due_date', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const data = result[0] as Activity[];
    const total = result[1] as number;

    return { data, rows: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, ..._opts: any[]): Promise<Activity> {
    const e = await this.repo.findOne({ where: { id } as any });
    if (!e) {
      throw new NotFoundException({ en: 'Activity not found', ar: 'النشاط غير موجود' });
    }
    return e;
  }

  async findDue(assignedTo: string, date?: string): Promise<Activity[]> {
    const cutoff = date ? new Date(date) : new Date();
    const rows = await this.repo.find({
      where: {
        assignedTo,
        completedAt: null as any,
        dueDate: LessThanOrEqual(cutoff),
      } as any,
      order: { dueDate: 'ASC' as const },
    });
    return rows as Activity[];
  }

  async create(data: Partial<Activity>, ..._opts: any[]): Promise<Activity> {
    const entity = this.repo.create(data as Activity);
    return this.repo.save(entity) as unknown as Promise<Activity>;
  }

  async complete(id: string, completedById: string): Promise<Activity> {
    const e = await this.findById(id);
    e.completedAt = new Date();
    e.completedById = completedById;
    return this.repo.save(e) as unknown as Promise<Activity>;
  }

  async softDelete(id: string, ..._opts: any[]): Promise<void> {
    await this.repo.softRemove(await this.findById(id));
  }
}
