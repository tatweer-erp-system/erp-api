import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { TaskStatus, TaskPriority } from '@/common/enums/project.enums';

@Entity({ name: 'tasks', schema: 'public' })
export class Task extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 500, name: 'title_en' })
  titleEn: string;

  @Column({ type: 'varchar', length: 500, name: 'title_ar' })
  titleAr: string;

  @Column({ type: 'text', name: 'description_en', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'text', name: 'description_ar', nullable: true })
  descriptionAr: string | null;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assignedTo: string | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'estimated_hours',
    default: 0,
  })
  estimatedHours: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'actual_hours',
    default: 0,
  })
  actualHours: number;

  @Column({ type: 'uuid', name: 'parent_task_id', nullable: true })
  parentTaskId: string | null;

  @Column({ type: 'int', default: 0 })
  sequence: number;
}
