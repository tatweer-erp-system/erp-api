import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../database/base.repository';
import { Task } from '../../../database/entities/task.entity';

@Injectable()
export class TasksRepository extends BaseRepository<Task> {
  constructor() {
    super(Task);
  }

  async findByProject(projectId: string): Promise<Task[]> {
    return this.findAllRaw({
      where: { projectId },
    });
  }

  async findByAssignee(userId: string): Promise<Task[]> {
    return this.findAllRaw({
      where: { assignedTo: userId },
    });
  }
}
