import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity({ name: 'task_time_entries', schema: 'public' })
export class TaskTimeEntry extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'task_id' })
  taskId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'date', name: 'entry_date' })
  entryDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hours: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
