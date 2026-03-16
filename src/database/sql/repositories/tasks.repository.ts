import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThan } from 'typeorm';
import { Task } from '@/database/sql/entities/task.entity';
import { TaskStatus, TaskPriority } from '@/common/enums/project.enums';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  async findAll(opts: {
    page?: number;
    limit?: number;
    search?: string;
    searchFields?: string[];
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    where?: Record<string, unknown>;
    tenantId?: string;
  }): Promise<{
    data: Task[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const order = opts.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.repo.createQueryBuilder('t').where('t.deleted_at IS NULL');

    if (opts.where?.projectId) {
      qb.andWhere('t.project_id = :projectId', { projectId: opts.where.projectId });
    }
    if (opts.where?.assignedTo) {
      qb.andWhere('t.assigned_to = :assignedTo', { assignedTo: opts.where.assignedTo });
    }
    if (opts.search) {
      qb.andWhere('(t.title_en ILIKE :q OR t.title_ar ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('t.created_at', order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, opts?: { tenantId?: string }): Promise<Task> {
    const entity = await this.repo.findOne({ where: { id, deletedAt: null } as any });
    if (!entity) {
      throw new NotFoundException({ en: 'Task not found', ar: 'المهمة غير موجودة' });
    }
    return entity;
  }

  async create(
    data: Partial<Task>,
    opts?: { auditContext?: any; tenantId?: string },
  ): Promise<Task> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<Task>,
    opts?: { auditContext?: any; tenantId?: string },
  ): Promise<Task> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async softDelete(id: string, opts?: { auditContext?: any; tenantId?: string }): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }

  async countByProject(tenantId: string, projectId: string): Promise<number> {
    return this.repo.count({ where: { projectId, deletedAt: null } as any });
  }

  async countCompletedByProject(tenantId: string, projectId: string): Promise<number> {
    return this.repo.count({
      where: { projectId, status: TaskStatus.DONE, deletedAt: null } as any,
    });
  }

  async countActiveByProject(tenantId: string, projectId: string): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.status NOT IN (:...done)', {
        done: [TaskStatus.DONE, TaskStatus.CANCELLED],
      });
    return qb.getCount();
  }

  async countByStatusForProject(
    tenantId: string,
    projectId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .groupBy('t.status')
      .getRawMany();

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }

  async getHoursSummaryForProject(
    tenantId: string,
    projectId: string,
  ): Promise<{ estimatedHours: number; loggedHours: number }> {
    const row = await this.repo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.estimated_hours), 0)', 'estimatedHours')
      .addSelect('COALESCE(SUM(t.actual_hours), 0)', 'loggedHours')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();
    return {
      estimatedHours: Number(row?.estimatedHours) || 0,
      loggedHours: Number(row?.loggedHours) || 0,
    };
  }

  async countOverdueByProject(tenantId: string, projectId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.due_date < NOW()')
      .andWhere('t.status NOT IN (:...done)', {
        done: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .getCount();
  }

  async findOverdue(tenantId: string, projectId: string): Promise<Task[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.due_date < NOW()')
      .andWhere('t.status NOT IN (:...done)', {
        done: [TaskStatus.DONE, TaskStatus.CANCELLED],
      })
      .orderBy('t.due_date', 'ASC')
      .getMany();
  }

  async atomicIncrementLoggedHours(tenantId: string, taskId: string, hours: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Task)
      .set({ actualHours: () => `actual_hours + ${hours}` })
      .where('id = :taskId', { taskId })
      .execute();
  }
}
