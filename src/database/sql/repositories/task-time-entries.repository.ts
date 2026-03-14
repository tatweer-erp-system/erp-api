import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { TaskTimeEntry } from '../entities/task-time-entry.entity';

@Injectable()
export class TaskTimeEntriesRepository extends BaseRepository<TaskTimeEntry> {
  constructor() {
    super(TaskTimeEntry, true);
  }
}
