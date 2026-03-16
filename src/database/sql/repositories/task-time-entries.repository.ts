import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskTimeEntry } from '@/database/sql/entities/task-time-entry.entity';

@Injectable()
export class TaskTimeEntriesRepository {
  constructor(
    @InjectRepository(TaskTimeEntry)
    private readonly repo: Repository<TaskTimeEntry>,
  ) {}

  async findByTask(taskId: string): Promise<TaskTimeEntry[]> {
    return this.repo.find({
      where: { taskId, deletedAt: null } as any,
      order: { entryDate: 'DESC' },
    });
  }

  async create(
    data: Partial<TaskTimeEntry>,
    opts?: { auditContext?: any; tenantId?: string },
  ): Promise<TaskTimeEntry> {
    const entity = this.repo.create({
      taskId: (data as any).taskId,
      userId: (data as any).userId,
      hours: (data as any).hours,
      description: (data as any).description ?? null,
      entryDate: (data as any).entryDate ? new Date((data as any).entryDate) : new Date(),
      createdBy: opts?.auditContext?.userId ?? null,
    });
    return this.repo.save(entity);
  }
}
